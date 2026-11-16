/**
 * Browser-side image preparation before POST /api/upload.
 *
 * Small JPEG/PNG/WebP/GIF files go up untouched (keeps PNG transparency and
 * GIF animation). Large photos (typical phone shots are 3–12 MB) and formats
 * the server rejects (HEIC, BMP, TIFF…) are decoded and re-encoded as JPEG,
 * stepping down dimensions/quality until they fit under MAX_UPLOAD_BYTES.
 */
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, MIN_UPLOAD_BYTES } from './policy.js';

export const UNSUPPORTED_IMAGE_MESSAGE = 'Please upload a JPG, PNG, WebP or GIF image.';

export const ENCODE_STEPS: readonly { maxEdge: number; quality: number }[] = [
  { maxEdge: 2560, quality: 0.85 },
  { maxEdge: 2048, quality: 0.8 },
  { maxEdge: 1600, quality: 0.75 },
  { maxEdge: 1280, quality: 0.7 },
];

export type PrepareDecision = { kind: 'as-is' } | { kind: 'reencode' } | { kind: 'reject'; reason: string };

interface FileInfo {
  type: string;
  size: number;
  name: string;
}

const TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  avif: 'image/avif',
};

function effectiveType({ type, name }: FileInfo): string {
  if (type) return type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return TYPE_BY_EXTENSION[ext] ?? '';
}

export function decideImagePreparation(file: FileInfo): PrepareDecision {
  if (file.size < MIN_UPLOAD_BYTES) return { kind: 'reject', reason: 'The selected file appears to be empty.' };

  const type = effectiveType(file);
  if (!type.startsWith('image/') || type === 'image/svg+xml') {
    return { kind: 'reject', reason: UNSUPPORTED_IMAGE_MESSAGE };
  }

  const isAllowed = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
  if (isAllowed && file.size <= MAX_UPLOAD_BYTES) return { kind: 'as-is' };
  if (type === 'image/gif') {
    return { kind: 'reject', reason: 'GIFs must be under 4 MB. Please use a smaller file.' };
  }
  return { kind: 'reencode' };
}

/** Encodes at decreasing size/quality; returns the first result that fits. */
export async function encodeWithinLimit(
  encode: (maxEdge: number, quality: number) => Promise<Blob>,
  maxBytes: number,
): Promise<Blob> {
  for (const { maxEdge, quality } of ENCODE_STEPS) {
    const blob = await encode(maxEdge, quality);
    if (blob.size <= maxBytes && blob.size >= MIN_UPLOAD_BYTES) return blob;
  }
  throw new Error('This image is too large to upload. Please choose a smaller image.');
}

export type ImageEncoder = (file: Blob, maxEdge: number, quality: number) => Promise<Blob>;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to <img> decoding (older Safari)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Canvas-based JPEG encoder (white background, so transparency doesn't go black). */
export const browserJpegEncoder: ImageEncoder = async (file, maxEdge, quality) => {
  const source = await decode(file);
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  if ('close' in source) source.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
      'image/jpeg',
      quality,
    );
  });
};

export async function prepareImageForUpload(file: File, encoder: ImageEncoder = browserJpegEncoder): Promise<Blob> {
  const decision = decideImagePreparation(file);
  if (decision.kind === 'reject') throw new Error(decision.reason);
  if (decision.kind === 'as-is') return file;

  try {
    return await encodeWithinLimit((maxEdge, quality) => encoder(file, maxEdge, quality), MAX_UPLOAD_BYTES);
  } catch (error) {
    if (error instanceof Error && /too large/i.test(error.message)) throw error;
    throw new Error(UNSUPPORTED_IMAGE_MESSAGE);
  }
}
