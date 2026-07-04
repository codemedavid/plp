import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { slugify } from '../../lib/slug';
import { formatPrice } from '../../utils/currency';

/** Auto-rotation cadence for the featured-product carousel (ms). */
export const ROTATE_MS = 3500;

/**
 * Navy "featured product" card for the article sidebar that continuously
 * slides through all supplied products (image + name + price + a working
 * VIEW PRODUCT link). Auto-advance pauses under prefers-reduced-motion.
 */
export default function ProductSpotlight({ products }: { products: Product[] }) {
  const count = products.length;
  const [index, setIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  // Keep the index valid if the product list length changes.
  useEffect(() => {
    setIndex(0);
  }, [count]);

  // Continuous slideshow — one advance per ROTATE_MS, unless reduced motion.
  useEffect(() => {
    if (count <= 1) return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(id);
  }, [count]);

  // Reset the image error flag whenever the visible product changes.
  useEffect(() => {
    setImgError(false);
  }, [index]);

  if (count === 0) return null;

  const product = products[index % count];
  const to = `/products/${slugify(product.name)}`;
  const price =
    product.discount_active && product.discount_price != null
      ? product.discount_price
      : product.base_price;
  const showImage = Boolean(product.image_url) && !imgError;

  return (
    <div style={{ padding: 22, background: '#17233E', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: '#C8A56A', marginBottom: 14 }}>
        FEATURED PRODUCTS
      </div>

      {/* Slide — keyed so it re-mounts and cross-fades on each change. */}
      <div key={product.id} className="research-fade">
        <Link to={to} style={{ display: 'block', textDecoration: 'none' }}>
          <div
            style={{
              width: '100%',
              aspectRatio: '4 / 3',
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: 14,
              background: 'linear-gradient(150deg,#22345A 0%,#2C3D63 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showImage ? (
              <img
                src={product.image_url as string}
                alt={product.name}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 40,
                  fontWeight: 600,
                  color: '#C8A56A',
                }}
              >
                {product.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              lineHeight: 1.2,
              color: '#FBF8F1',
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {product.name}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: '#C8A56A', marginBottom: 16 }}>
            {formatPrice(price)}
          </div>
        </Link>
      </div>

      <Link
        to={to}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.1em',
          color: '#C8A56A',
          textDecoration: 'none',
        }}
      >
        VIEW PRODUCT
        <svg width="16" height="10" viewBox="0 0 24 14" fill="none" stroke="#C8A56A" strokeWidth="2">
          <path d="M0 7h18M13 1l6 6-6 6" />
        </svg>
      </Link>

      {/* Progress dots — also allow manual selection. */}
      {count > 1 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Show ${p.name}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                padding: 0,
                border: 'none',
                borderRadius: 100,
                cursor: 'pointer',
                background: i === index ? '#C8A56A' : 'rgba(200,165,106,0.35)',
                transition: 'width .3s ease, background .3s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
