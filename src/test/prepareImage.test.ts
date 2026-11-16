import { describe, it, expect, vi } from 'vitest';
import {
  ENCODE_STEPS,
  decideImagePreparation,
  encodeWithinLimit,
  prepareImageForUpload,
} from '../lib/upload/prepareImage';
import { MAX_UPLOAD_BYTES } from '../lib/upload/policy';

const MB = 1024 * 1024;
const fileLike = (type: string, size: number, name = 'photo') => ({ type, size, name });

describe('decideImagePreparation', () => {
  it('passes small supported images through untouched (keeps PNG transparency, GIF animation)', () => {
    expect(decideImagePreparation(fileLike('image/jpeg', 2 * MB))).toEqual({ kind: 'as-is' });
    expect(decideImagePreparation(fileLike('image/png', 300_000))).toEqual({ kind: 'as-is' });
    expect(decideImagePreparation(fileLike('image/webp', 300_000))).toEqual({ kind: 'as-is' });
    expect(decideImagePreparation(fileLike('image/gif', 300_000))).toEqual({ kind: 'as-is' });
  });

  it('re-encodes a typical 6–12 MB phone photo so it fits under the upload limit', () => {
    expect(decideImagePreparation(fileLike('image/jpeg', 6 * MB))).toEqual({ kind: 'reencode' });
    expect(decideImagePreparation(fileLike('image/png', 12 * MB))).toEqual({ kind: 'reencode' });
  });

  it('converts formats the server does not accept (HEIC, BMP, TIFF)', () => {
    expect(decideImagePreparation(fileLike('image/heic', 2 * MB))).toEqual({ kind: 'reencode' });
    expect(decideImagePreparation(fileLike('', 2 * MB, 'IMG_0001.HEIC'))).toEqual({ kind: 'reencode' });
    expect(decideImagePreparation(fileLike('image/bmp', 1 * MB))).toEqual({ kind: 'reencode' });
  });

  it('rejects empty files, non-images, SVG and oversized GIFs', () => {
    expect(decideImagePreparation(fileLike('image/jpeg', 10)).kind).toBe('reject');
    expect(decideImagePreparation(fileLike('application/pdf', MB, 'x.pdf')).kind).toBe('reject');
    expect(decideImagePreparation(fileLike('image/svg+xml', 1000, 'x.svg')).kind).toBe('reject');
    expect(decideImagePreparation(fileLike('image/gif', MAX_UPLOAD_BYTES + 1)).kind).toBe('reject');
  });

  it('infers type from the extension when the browser gives none', () => {
    expect(decideImagePreparation(fileLike('', 200_000, 'logo.png'))).toEqual({ kind: 'as-is' });
  });
});

describe('encodeWithinLimit', () => {
  it('returns the first encoding that fits', async () => {
    const encode = vi.fn().mockResolvedValue(new Blob([new Uint8Array(1000)], { type: 'image/jpeg' }));
    const blob = await encodeWithinLimit(encode, MAX_UPLOAD_BYTES);
    expect(blob.size).toBe(1000);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode).toHaveBeenCalledWith(ENCODE_STEPS[0].maxEdge, ENCODE_STEPS[0].quality);
  });

  it('steps down size/quality until it fits', async () => {
    const sizes = [6 * MB, 5 * MB, 3 * MB];
    const encode = vi.fn().mockImplementation(async () => new Blob([new Uint8Array(sizes.shift()!)]));
    const blob = await encodeWithinLimit(encode, 4 * MB);
    expect(blob.size).toBe(3 * MB);
    expect(encode).toHaveBeenCalledTimes(3);
  });

  it('gives a friendly error when nothing fits', async () => {
    const encode = vi.fn().mockImplementation(async () => new Blob([new Uint8Array(100)]));
    await expect(encodeWithinLimit(encode, 50)).rejects.toThrow(/too large/i);
    expect(encode).toHaveBeenCalledTimes(ENCODE_STEPS.length);
  });
});

describe('prepareImageForUpload', () => {
  it('returns the original file when it can go as-is', async () => {
    const file = new File([new Uint8Array(5000)], 'a.png', { type: 'image/png' });
    const encoder = vi.fn();
    expect(await prepareImageForUpload(file, encoder)).toBe(file);
    expect(encoder).not.toHaveBeenCalled();
  });

  it('re-encodes a large photo via the encoder', async () => {
    const big = new File([new Uint8Array(6 * MB)], 'IMG_1234.jpg', { type: 'image/jpeg' });
    const out = new Blob([new Uint8Array(900_000)], { type: 'image/jpeg' });
    const encoder = vi.fn().mockResolvedValue(out);
    expect(await prepareImageForUpload(big, encoder)).toBe(out);
    expect(encoder).toHaveBeenCalledWith(big, ENCODE_STEPS[0].maxEdge, ENCODE_STEPS[0].quality);
  });

  it('turns a decode failure into a clear message', async () => {
    const heic = new File([new Uint8Array(2 * MB)], 'IMG.HEIC', { type: 'image/heic' });
    const encoder = vi.fn().mockRejectedValue(new Error('decode failed'));
    await expect(prepareImageForUpload(heic, encoder)).rejects.toThrow(/JPG, PNG, WebP or GIF/);
  });

  it('rejects unsupported files before any work', async () => {
    const pdf = new File([new Uint8Array(5000)], 'x.pdf', { type: 'application/pdf' });
    await expect(prepareImageForUpload(pdf, vi.fn())).rejects.toThrow(/JPG, PNG, WebP or GIF/);
  });
});
