import { randomUUID } from 'crypto';
import { handleUploadRequest } from '../src/lib/upload/handler.js';
import { uploadToImageKit } from '../src/lib/upload/imagekitServer.js';
import { verifySupabaseUser } from '../src/lib/upload/verifyUser.js';
import { createRateLimiter } from '../src/lib/upload/rateLimit.js';
import { MAX_UPLOAD_BYTES } from '../src/lib/upload/policy.js';

// POST /api/upload?purpose=<purpose>  body: raw image bytes
// Replaces the old public /api/imagekit-auth token endpoint: the browser never
// talks to ImageKit directly, so it can no longer choose folder/overwrite params.
// Same-origin only (no CORS headers). Decisions live in src/lib/upload/handler.ts.

// Best-effort per-instance limit for public/user uploads (payment proofs, avatars).
const RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };
const limiter = createRateLimiter(RATE_LIMIT);

type HeaderValue = string | string[] | undefined;

interface UploadHttpRequest extends AsyncIterable<Uint8Array | string> {
  method?: string;
  query?: Record<string, HeaderValue>;
  headers: Record<string, HeaderValue>;
}

interface UploadHttpResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
}

function firstHeader(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function clientIp(req: UploadHttpRequest): string {
  // Vercel sets x-real-ip / x-forwarded-for itself (client values are overwritten).
  const real = firstHeader(req.headers['x-real-ip']);
  if (real) return real.trim();
  const forwarded = firstHeader(req.headers['x-forwarded-for']);
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

/** Reads the raw request stream, bailing out as soon as it exceeds `maxBytes`. */
async function readRawBody(req: UploadHttpRequest, maxBytes: number): Promise<Uint8Array | 'too-large'> {
  const declared = Number(firstHeader(req.headers['content-length']));
  if (Number.isFinite(declared) && declared > maxBytes) return 'too-large';

  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of req) {
    const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk;
    total += bytes.byteLength;
    if (total > maxBytes) return 'too-large';
    chunks.push(bytes);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export default async function handler(req: UploadHttpRequest, res: UploadHttpResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!privateKey || !supabaseUrl || !anonKey) {
    console.error('upload: missing env (IMAGEKIT_PRIVATE_KEY / SUPABASE_URL / SUPABASE_ANON_KEY)');
    return res.status(500).json({ error: 'Uploads are not configured.' });
  }

  try {
    const result = await handleUploadRequest(
      {
        method: req.method ?? '',
        purpose: firstHeader(req.query?.purpose),
        authorization: req.headers['authorization'],
        clientIp: clientIp(req),
        readBody: () => readRawBody(req, MAX_UPLOAD_BYTES),
      },
      {
        verifyUser: (token) => verifySupabaseUser(token, { supabaseUrl, anonKey }),
        uploadToImageKit: (params) => uploadToImageKit({ privateKey }, params),
        checkRateLimit: (key, nowMs) => limiter.check(key, nowMs),
        now: () => Date.now(),
        randomId: () => randomUUID().replace(/-/g, '').slice(0, 12),
        logError: (message, error) =>
          console.error(message, error instanceof Error ? error.message : error),
      },
    );
    if (result.status === 405) res.setHeader('Allow', 'POST');
    return res.status(result.status).json(result.body);
  } catch (error: unknown) {
    console.error('upload: unexpected error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
}
