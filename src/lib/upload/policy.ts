/**
 * Upload policy shared by the browser (src/hooks/useImageUpload.ts) and the
 * server (api/upload.ts). The SERVER is the authority: the folder, file name,
 * overwrite behaviour and accepted types are chosen here, never by the client.
 *
 * Reachable from api/*.ts — keep relative imports in this folder ending in
 * `.js` (Vercel's Node ESM runtime requires explicit extensions).
 */

export const UPLOAD_PURPOSES = [
  'payment-proof',
  'avatar',
  'product',
  'payment-qr',
  'hero',
  'logo',
  'guide',
] as const;

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/** public = anyone (guest checkout); user = any signed-in user; admin = is_admin(). */
export type UploadAccess = 'public' | 'user' | 'admin';

export interface UploadRule {
  folder: string;
  access: UploadAccess;
}

export const UPLOAD_RULES: Readonly<Record<UploadPurpose, UploadRule>> = {
  'payment-proof': { folder: '/plp/payment-proofs', access: 'public' },
  avatar: { folder: '/plp/avatars', access: 'user' },
  product: { folder: '/plp/products', access: 'admin' },
  'payment-qr': { folder: '/plp/payment-qr', access: 'admin' },
  hero: { folder: '/plp/hero', access: 'admin' },
  logo: { folder: '/plp/logo', access: 'admin' },
  guide: { folder: '/plp/guides', access: 'admin' },
};

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** 4 MB: comfortably under Vercel's 4.5 MB serverless request-body cap. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MIN_UPLOAD_BYTES = 100;

const EXTENSION_BY_TYPE: Readonly<Record<AllowedImageType, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUploadPurpose(value: unknown): value is UploadPurpose {
  return typeof value === 'string' && (UPLOAD_PURPOSES as readonly string[]).includes(value);
}

/** Server-chosen ImageKit folder. Avatars go into the caller's own sub-folder. */
export function resolveUploadFolder(purpose: UploadPurpose, userId?: string): string {
  const { folder } = UPLOAD_RULES[purpose];
  if (purpose !== 'avatar') return folder;
  if (!userId || !UUID_RE.test(userId)) {
    throw new Error('A valid user id is required for avatar uploads');
  }
  return `${folder}/${userId.toLowerCase()}`;
}

/** Returns a user-facing error, or null when the size is acceptable. */
export function validateUploadSize(bytes: number): string | null {
  if (bytes < MIN_UPLOAD_BYTES) return 'The file is empty or invalid.';
  if (bytes > MAX_UPLOAD_BYTES) {
    return `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`;
  }
  return null;
}

const startsWith = (bytes: Uint8Array, sig: readonly number[], offset = 0): boolean =>
  sig.every((b, i) => bytes[offset + i] === b);

/**
 * Detect the real image type from magic bytes. Anything that is not a
 * JPEG/PNG/GIF/WebP (SVG, HTML, PDF, …) returns null — the client-declared
 * Content-Type is never trusted.
 */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}

export function buildServerFileName(
  purpose: UploadPurpose,
  type: AllowedImageType,
  nowMs: number,
  randomId: string,
): string {
  const safeId = randomId.replace(/[^a-zA-Z0-9]/g, '');
  return `${purpose}-${nowMs}-${safeId}.${EXTENSION_BY_TYPE[type]}`;
}

export function parseBearerToken(header: string | string[] | undefined): string | null {
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}
