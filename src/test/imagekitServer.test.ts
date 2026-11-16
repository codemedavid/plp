import { describe, it, expect, vi } from 'vitest';
import {
  IMAGEKIT_UPLOAD_URL,
  buildImageKitUploadForm,
  uploadToImageKit,
} from '../lib/upload/imagekitServer';

const params = {
  bytes: new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]),
  mime: 'image/jpeg' as const,
  folder: '/plp/payment-proofs',
  fileName: 'payment-proof-1-x.jpg',
};

describe('buildImageKitUploadForm', () => {
  it('pins every overwrite-related option server-side', () => {
    const form = buildImageKitUploadForm(params);
    expect(form.get('fileName')).toBe('payment-proof-1-x.jpg');
    expect(form.get('folder')).toBe('/plp/payment-proofs');
    expect(form.get('useUniqueFileName')).toBe('true');
    expect(form.get('overwriteFile')).toBe('false');
    expect(form.get('overwriteAITags')).toBe('false');
    expect(form.get('overwriteTags')).toBe('false');
    expect(form.get('overwriteCustomMetadata')).toBe('false');
    expect(form.get('isPrivateFile')).toBe('false');
    // Server-side upload: no client-token fields.
    expect(form.get('publicKey')).toBeNull();
    expect(form.get('signature')).toBeNull();
  });

  it('sends the bytes as a typed file part', () => {
    const file = buildImageKitUploadForm(params).get('file') as Blob;
    expect(file).toBeInstanceOf(Blob);
    expect(file.size).toBe(6);
    expect(file.type).toBe('image/jpeg');
  });
});

describe('uploadToImageKit', () => {
  it('POSTs to the upload API with Basic auth from the private key and returns the URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://ik.imagekit.io/acct/plp/payment-proofs/a.jpg', fileId: 'f1' }), {
        status: 200,
      }),
    );
    const result = await uploadToImageKit({ privateKey: 'private_abc', fetchImpl }, params);
    expect(result).toEqual({ url: 'https://ik.imagekit.io/acct/plp/payment-proofs/a.jpg' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(IMAGEKIT_UPLOAD_URL);
    expect(url).toBe('https://upload.imagekit.io/api/v1/files/upload');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Basic ${btoa('private_abc:')}`);
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('throws with status + message on an ImageKit error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Your account cannot be authenticated.' }), { status: 403 }),
    );
    await expect(uploadToImageKit({ privateKey: 'k', fetchImpl }, params)).rejects.toThrow(/403.*authenticated/);
  });

  it('throws when the response has no https URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ fileId: 'x' }), { status: 200 }));
    await expect(uploadToImageKit({ privateKey: 'k', fetchImpl }, params)).rejects.toThrow(/no url/i);
  });
});
