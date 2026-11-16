import { describe, it, expect, vi } from 'vitest';
import { handleUploadRequest, type UploadDeps, type UploadRequestInput } from '../lib/upload/handler';
import { MAX_UPLOAD_BYTES } from '../lib/upload/policy';

const USER_ID = '3f1c2b7a-9d4e-4a6b-8c2d-1e2f3a4b5c6d';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(200).fill(1)]);

function makeDeps(overrides: Partial<UploadDeps> = {}): UploadDeps {
  return {
    verifyUser: vi.fn().mockResolvedValue(null),
    uploadToImageKit: vi.fn().mockResolvedValue({ url: 'https://ik.imagekit.io/x/plp/a.jpg' }),
    checkRateLimit: vi.fn().mockReturnValue(true),
    now: () => 1700000000000,
    randomId: () => 'rnd',
    logError: vi.fn(),
    ...overrides,
  };
}

function makeInput(overrides: Partial<UploadRequestInput> = {}): UploadRequestInput {
  return {
    method: 'POST',
    purpose: 'payment-proof',
    authorization: undefined,
    clientIp: '203.0.113.9',
    readBody: vi.fn().mockResolvedValue(JPEG),
    ...overrides,
  };
}

describe('handleUploadRequest — request shape', () => {
  it('rejects non-POST', async () => {
    const res = await handleUploadRequest(makeInput({ method: 'GET' }), makeDeps());
    expect(res.status).toBe(405);
  });

  it('rejects unknown purposes without reading the body', async () => {
    const input = makeInput({ purpose: '../../products' });
    const deps = makeDeps();
    const res = await handleUploadRequest(input, deps);
    expect(res.status).toBe(400);
    expect(input.readBody).not.toHaveBeenCalled();
    expect(deps.uploadToImageKit).not.toHaveBeenCalled();
  });
});

describe('handleUploadRequest — payment proofs (public)', () => {
  it('uploads a guest proof to the fixed folder with a server-chosen name', async () => {
    const deps = makeDeps();
    const res = await handleUploadRequest(makeInput(), deps);
    expect(res).toEqual({ status: 200, body: { url: 'https://ik.imagekit.io/x/plp/a.jpg' } });
    expect(deps.verifyUser).not.toHaveBeenCalled();
    expect(deps.uploadToImageKit).toHaveBeenCalledWith({
      bytes: JPEG,
      mime: 'image/jpeg',
      folder: '/plp/payment-proofs',
      fileName: 'payment-proof-1700000000000-rnd.jpg',
    });
  });

  it('rate-limits per client IP', async () => {
    const deps = makeDeps({ checkRateLimit: vi.fn().mockReturnValue(false) });
    const input = makeInput();
    const res = await handleUploadRequest(input, deps);
    expect(res.status).toBe(429);
    expect(deps.checkRateLimit).toHaveBeenCalledWith('ip:203.0.113.9', 1700000000000);
    expect(input.readBody).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await handleUploadRequest(
      makeInput({ readBody: vi.fn().mockResolvedValue('too-large') }),
      makeDeps(),
    );
    expect(res.status).toBe(413);
  });

  it('rejects bodies over the byte limit even if the reader returned them', async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    const res = await handleUploadRequest(makeInput({ readBody: vi.fn().mockResolvedValue(big) }), makeDeps());
    expect(res.status).toBe(413);
  });

  it('rejects empty bodies', async () => {
    const res = await handleUploadRequest(
      makeInput({ readBody: vi.fn().mockResolvedValue(new Uint8Array(10)) }),
      makeDeps(),
    );
    expect(res.status).toBe(400);
  });

  it('rejects non-images by content, not by claimed type (415)', async () => {
    const html = new TextEncoder().encode('<html><script>alert(1)</script></html>'.padEnd(300, ' '));
    const deps = makeDeps();
    const res = await handleUploadRequest(makeInput({ readBody: vi.fn().mockResolvedValue(html) }), deps);
    expect(res.status).toBe(415);
    expect(deps.uploadToImageKit).not.toHaveBeenCalled();
  });

  it('hides ImageKit failure details from the client and logs them', async () => {
    const deps = makeDeps({ uploadToImageKit: vi.fn().mockRejectedValue(new Error('ImageKit 401: bad key')) });
    const res = await handleUploadRequest(makeInput(), deps);
    expect(res.status).toBe(502);
    expect(res.body.error).not.toMatch(/key/i);
    expect(deps.logError).toHaveBeenCalled();
  });
});

describe('handleUploadRequest — admin purposes', () => {
  for (const purpose of ['product', 'payment-qr', 'hero', 'logo', 'guide']) {
    it(`rejects ${purpose} without a token (401) and never reads the body`, async () => {
      const input = makeInput({ purpose });
      const deps = makeDeps();
      const res = await handleUploadRequest(input, deps);
      expect(res.status).toBe(401);
      expect(input.readBody).not.toHaveBeenCalled();
      expect(deps.uploadToImageKit).not.toHaveBeenCalled();
    });
  }

  it('rejects an invalid/expired token (401)', async () => {
    const deps = makeDeps({ verifyUser: vi.fn().mockResolvedValue(null) });
    const res = await handleUploadRequest(makeInput({ purpose: 'product', authorization: 'Bearer bad' }), deps);
    expect(res.status).toBe(401);
    expect(deps.verifyUser).toHaveBeenCalledWith('bad');
    expect(deps.uploadToImageKit).not.toHaveBeenCalled();
  });

  it('rejects a signed-in non-admin (403)', async () => {
    const deps = makeDeps({ verifyUser: vi.fn().mockResolvedValue({ userId: USER_ID, isAdmin: false }) });
    const input = makeInput({ purpose: 'product', authorization: 'Bearer good' });
    const res = await handleUploadRequest(input, deps);
    expect(res.status).toBe(403);
    expect(input.readBody).not.toHaveBeenCalled();
    expect(deps.uploadToImageKit).not.toHaveBeenCalled();
  });

  it('returns 503 (not a silent pass) when auth verification itself fails', async () => {
    const deps = makeDeps({ verifyUser: vi.fn().mockRejectedValue(new Error('supabase down')) });
    const res = await handleUploadRequest(makeInput({ purpose: 'product', authorization: 'Bearer good' }), deps);
    expect(res.status).toBe(503);
    expect(deps.uploadToImageKit).not.toHaveBeenCalled();
  });

  it('uploads for an admin into the purpose folder, without rate limiting', async () => {
    const deps = makeDeps({ verifyUser: vi.fn().mockResolvedValue({ userId: USER_ID, isAdmin: true }) });
    const res = await handleUploadRequest(makeInput({ purpose: 'product', authorization: 'Bearer good' }), deps);
    expect(res.status).toBe(200);
    expect(deps.checkRateLimit).not.toHaveBeenCalled();
    expect(deps.uploadToImageKit).toHaveBeenCalledWith(
      expect.objectContaining({ folder: '/plp/products', fileName: 'product-1700000000000-rnd.jpg' }),
    );
  });
});

describe('handleUploadRequest — avatars (signed-in user)', () => {
  it('requires a token', async () => {
    const res = await handleUploadRequest(makeInput({ purpose: 'avatar' }), makeDeps());
    expect(res.status).toBe(401);
  });

  it('uploads into the caller\'s own folder and rate-limits per user', async () => {
    const deps = makeDeps({ verifyUser: vi.fn().mockResolvedValue({ userId: USER_ID, isAdmin: false }) });
    const res = await handleUploadRequest(makeInput({ purpose: 'avatar', authorization: 'Bearer good' }), deps);
    expect(res.status).toBe(200);
    expect(deps.checkRateLimit).toHaveBeenCalledWith(`user:${USER_ID}`, 1700000000000);
    expect(deps.uploadToImageKit).toHaveBeenCalledWith(
      expect.objectContaining({ folder: `/plp/avatars/${USER_ID}` }),
    );
  });
});
