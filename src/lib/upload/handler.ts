/**
 * Framework-agnostic core of POST /api/upload. api/upload.ts only adapts the
 * Vercel request/response and wires real dependencies; all decisions live here.
 */
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_RULES,
  buildServerFileName,
  isUploadPurpose,
  parseBearerToken,
  resolveUploadFolder,
  sniffImageType,
  validateUploadSize,
  type AllowedImageType,
} from './policy.js';

export interface VerifiedUser {
  userId: string;
  isAdmin: boolean;
}

export interface ImageKitUploadParams {
  bytes: Uint8Array;
  mime: AllowedImageType;
  folder: string;
  fileName: string;
}

export interface UploadDeps {
  /** Resolves null for a missing/invalid token; throws if verification itself fails. */
  verifyUser: (token: string) => Promise<VerifiedUser | null>;
  uploadToImageKit: (params: ImageKitUploadParams) => Promise<{ url: string }>;
  checkRateLimit: (key: string, nowMs: number) => boolean;
  now: () => number;
  randomId: () => string;
  logError: (message: string, error?: unknown) => void;
}

export interface UploadRequestInput {
  method: string;
  purpose: unknown;
  authorization: string | string[] | undefined;
  clientIp: string;
  /** Lazily reads the body; resolves 'too-large' as soon as the cap is exceeded. */
  readBody: () => Promise<Uint8Array | 'too-large'>;
}

export interface UploadResult {
  status: number;
  body: { url?: string; error?: string };
}

const fail = (status: number, error: string): UploadResult => ({ status, body: { error } });

type AuthOutcome = { ok: true; user: VerifiedUser | null } | { ok: false; result: UploadResult };

async function authorize(
  access: 'public' | 'user' | 'admin',
  authorization: UploadRequestInput['authorization'],
  deps: UploadDeps,
): Promise<AuthOutcome> {
  if (access === 'public') return { ok: true, user: null };

  const token = parseBearerToken(authorization);
  if (!token) return { ok: false, result: fail(401, 'Please sign in to upload.') };

  let user: VerifiedUser | null;
  try {
    user = await deps.verifyUser(token);
  } catch (error) {
    deps.logError('upload: auth verification failed', error);
    return { ok: false, result: fail(503, 'Could not verify your session. Please try again.') };
  }
  if (!user) return { ok: false, result: fail(401, 'Your session has expired. Please sign in again.') };
  if (access === 'admin' && !user.isAdmin) {
    return { ok: false, result: fail(403, 'Admin access required.') };
  }
  return { ok: true, user };
}

export async function handleUploadRequest(input: UploadRequestInput, deps: UploadDeps): Promise<UploadResult> {
  if (input.method !== 'POST') return fail(405, 'Method not allowed');
  if (!isUploadPurpose(input.purpose)) return fail(400, 'Unknown upload purpose.');

  const purpose = input.purpose;
  const { access } = UPLOAD_RULES[purpose];

  const auth = await authorize(access, input.authorization, deps);
  if (!auth.ok) return auth.result;

  const nowMs = deps.now();
  if (access !== 'admin') {
    const key = auth.user ? `user:${auth.user.userId}` : `ip:${input.clientIp}`;
    if (!deps.checkRateLimit(key, nowMs)) {
      return fail(429, 'Too many uploads. Please wait a few minutes and try again.');
    }
  }

  const body = await input.readBody();
  if (body === 'too-large' || body.byteLength > MAX_UPLOAD_BYTES) {
    return fail(413, validateUploadSize(MAX_UPLOAD_BYTES + 1) ?? 'File too large.');
  }
  const sizeError = validateUploadSize(body.byteLength);
  if (sizeError) return fail(400, sizeError);

  const mime = sniffImageType(body);
  if (!mime) return fail(415, 'Please upload a JPG, PNG, WebP or GIF image.');

  try {
    const { url } = await deps.uploadToImageKit({
      bytes: body,
      mime,
      folder: resolveUploadFolder(purpose, auth.user?.userId),
      fileName: buildServerFileName(purpose, mime, nowMs, deps.randomId()),
    });
    return { status: 200, body: { url } };
  } catch (error) {
    deps.logError(`upload: ImageKit upload failed (purpose=${purpose})`, error);
    return fail(502, 'Upload failed. Please try again.');
  }
}
