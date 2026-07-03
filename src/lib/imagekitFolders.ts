/**
 * Central taxonomy for ImageKit storage folders.
 *
 * All PLP image uploads live under a single `/plp` parent folder, organized by
 * surface. Passing one of these values to `useImageUpload(folder)` (or the
 * `folder` prop of `<ImageUpload />`) makes the hook upload to `/plp/<name>`.
 *
 * Keep folder names here — never inline magic strings at call sites.
 */
export const IMAGEKIT_FOLDERS = {
  /** Product catalog images (customer-facing). */
  products: 'plp/products',
  /** Payment method QR codes. */
  paymentQr: 'plp/payment-qr',
  /** Customer proof-of-payment screenshots. */
  paymentProofs: 'plp/payment-proofs',
  /** Hero carousel slides. */
  hero: 'plp/hero',
  /** Site logo. */
  logo: 'plp/logo',
  /** Guide / article cover images. */
  guides: 'plp/guides',
  /** User profile avatars. */
  avatars: 'plp/avatars',
} as const;

export type ImageKitFolder = (typeof IMAGEKIT_FOLDERS)[keyof typeof IMAGEKIT_FOLDERS];
