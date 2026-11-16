import { describe, it, expect } from 'vitest';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_RULES,
  buildServerFileName,
  isUploadPurpose,
  parseBearerToken,
  resolveUploadFolder,
  sniffImageType,
  validateUploadSize,
} from '../lib/upload/policy';

const bytes = (...b: number[]) => new Uint8Array(b);
const USER_ID = '3f1c2b7a-9d4e-4a6b-8c2d-1e2f3a4b5c6d';

describe('upload purposes', () => {
  it('accepts every known purpose and rejects anything else', () => {
    for (const p of ['payment-proof', 'avatar', 'product', 'payment-qr', 'hero', 'logo', 'guide']) {
      expect(isUploadPurpose(p)).toBe(true);
    }
    for (const p of ['', 'PRODUCT', '../products', 'menu-images', null, undefined, 42]) {
      expect(isUploadPurpose(p)).toBe(false);
    }
  });

  it('only payment proofs are public; avatars need a user; catalog assets need an admin', () => {
    expect(UPLOAD_RULES['payment-proof'].access).toBe('public');
    expect(UPLOAD_RULES.avatar.access).toBe('user');
    for (const p of ['product', 'payment-qr', 'hero', 'logo', 'guide'] as const) {
      expect(UPLOAD_RULES[p].access).toBe('admin');
    }
  });
});

describe('resolveUploadFolder', () => {
  it('maps each purpose to a fixed folder under /plp', () => {
    expect(resolveUploadFolder('payment-proof')).toBe('/plp/payment-proofs');
    expect(resolveUploadFolder('product')).toBe('/plp/products');
    expect(resolveUploadFolder('payment-qr')).toBe('/plp/payment-qr');
    expect(resolveUploadFolder('hero')).toBe('/plp/hero');
    expect(resolveUploadFolder('logo')).toBe('/plp/logo');
    expect(resolveUploadFolder('guide')).toBe('/plp/guides');
  });

  it('puts avatars in the signed-in user\'s own folder', () => {
    expect(resolveUploadFolder('avatar', USER_ID)).toBe(`/plp/avatars/${USER_ID}`);
  });

  it('refuses an avatar folder without a valid user id (no path injection)', () => {
    expect(() => resolveUploadFolder('avatar')).toThrow();
    expect(() => resolveUploadFolder('avatar', '../products')).toThrow();
    expect(() => resolveUploadFolder('avatar', `${USER_ID}/x`)).toThrow();
  });
});

describe('validateUploadSize', () => {
  it('rejects empty/tiny files', () => {
    expect(validateUploadSize(0)).toMatch(/empty/i);
    expect(validateUploadSize(99)).toMatch(/empty/i);
  });

  it('rejects files over the limit, which stays under Vercel\'s 4.5 MB body cap', () => {
    expect(MAX_UPLOAD_BYTES).toBeLessThan(4.5 * 1024 * 1024);
    expect(validateUploadSize(MAX_UPLOAD_BYTES + 1)).toMatch(/too large/i);
  });

  it('accepts sizes within range', () => {
    expect(validateUploadSize(100)).toBeNull();
    expect(validateUploadSize(MAX_UPLOAD_BYTES)).toBeNull();
  });
});

describe('sniffImageType', () => {
  it('detects JPEG, PNG, GIF and WebP from magic bytes', () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe('image/jpeg');
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0))).toBe('image/png');
    expect(sniffImageType(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0))).toBe('image/gif');
    expect(
      sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)),
    ).toBe('image/webp');
  });

  it('rejects anything else regardless of what the client claims', () => {
    // SVG (can carry script), HTML, PDF, RIFF/WAVE, too short
    expect(sniffImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode('<!doctype html><script>'))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode('%PDF-1.7 aaaaaaa'))).toBeNull();
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45))).toBeNull();
    expect(sniffImageType(bytes(0xff, 0xd8))).toBeNull();
  });
});

describe('buildServerFileName', () => {
  it('derives the name from purpose + sniffed type, never from client input', () => {
    expect(buildServerFileName('payment-proof', 'image/jpeg', 1700000000000, 'abc123')).toBe(
      'payment-proof-1700000000000-abc123.jpg',
    );
    expect(buildServerFileName('logo', 'image/png', 1, 'x')).toBe('logo-1-x.png');
    expect(buildServerFileName('hero', 'image/webp', 1, 'x')).toBe('hero-1-x.webp');
    expect(buildServerFileName('guide', 'image/gif', 1, 'x')).toBe('guide-1-x.gif');
  });

  it('strips anything unsafe from the random id', () => {
    expect(buildServerFileName('product', 'image/jpeg', 1, '../a/b')).toBe('product-1-ab.jpg');
  });
});

describe('parseBearerToken', () => {
  it('extracts a bearer token', () => {
    expect(parseBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(parseBearerToken('bearer   abc')).toBe('abc');
  });

  it('returns null when absent or malformed', () => {
    expect(parseBearerToken(undefined)).toBeNull();
    expect(parseBearerToken('')).toBeNull();
    expect(parseBearerToken('Basic abc')).toBeNull();
    expect(parseBearerToken('Bearer ')).toBeNull();
    expect(parseBearerToken(['Bearer a', 'Bearer b'])).toBeNull();
  });
});
