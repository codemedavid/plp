import { describe, it, expect, vi } from 'vitest';
import { UPLOAD_ENDPOINT, sendUpload } from '../lib/upload/uploadClient';

class FakeXhr {
  static last: FakeXhr;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown;
  status = 0;
  responseText = '';
  timeout = 0;
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v;
  }
  send(body: unknown) {
    this.body = body;
  }
  respond(status: number, json: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(json);
    this.onload?.();
  }
}

const createXhr = () => new FakeXhr() as unknown as XMLHttpRequest;
const blob = new Blob([new Uint8Array(500)], { type: 'image/jpeg' });

describe('sendUpload', () => {
  it('POSTs the raw image to our endpoint with the purpose and type', async () => {
    const p = sendUpload({ body: blob, purpose: 'payment-proof', accessToken: null, createXhr });
    const xhr = FakeXhr.last;
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe(`${UPLOAD_ENDPOINT}?purpose=payment-proof`);
    expect(xhr.headers['Content-Type']).toBe('image/jpeg');
    expect(xhr.headers.Authorization).toBeUndefined();
    expect(xhr.body).toBe(blob);
    xhr.respond(200, { url: 'https://ik.imagekit.io/a.jpg' });
    await expect(p).resolves.toBe('https://ik.imagekit.io/a.jpg');
  });

  it('sends the Supabase access token as a bearer header when given', async () => {
    const p = sendUpload({ body: blob, purpose: 'product', accessToken: 'jwt', createXhr });
    expect(FakeXhr.last.headers.Authorization).toBe('Bearer jwt');
    FakeXhr.last.respond(200, { url: 'https://ik.imagekit.io/b.jpg' });
    await p;
  });

  it('reports progress', async () => {
    const onProgress = vi.fn();
    const p = sendUpload({ body: blob, purpose: 'hero', accessToken: 't', onProgress, createXhr });
    FakeXhr.last.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 200 });
    expect(onProgress).toHaveBeenCalledWith(25);
    FakeXhr.last.respond(200, { url: 'https://x/y.jpg' });
    await p;
  });

  it('surfaces the server error message', async () => {
    const p = sendUpload({ body: blob, purpose: 'product', accessToken: 't', createXhr });
    FakeXhr.last.respond(403, { error: 'Admin access required.' });
    await expect(p).rejects.toThrow('Admin access required.');
  });

  it('gives a friendly message on rate limiting', async () => {
    const p = sendUpload({ body: blob, purpose: 'payment-proof', accessToken: null, createXhr });
    FakeXhr.last.respond(429, {});
    await expect(p).rejects.toThrow(/too many uploads/i);
  });

  it('rejects on network error', async () => {
    const p = sendUpload({ body: blob, purpose: 'payment-proof', accessToken: null, createXhr });
    FakeXhr.last.onerror?.();
    await expect(p).rejects.toThrow(/network/i);
  });
});
