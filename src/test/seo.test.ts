import { describe, it, expect } from 'vitest';
import {
  SITE_URL,
  absoluteUrl,
  organizationSchema,
  websiteSchema,
  productSchema,
} from '../lib/seo';

describe('absoluteUrl', () => {
  it('returns the bare site URL for the root path', () => {
    expect(absoluteUrl('/')).toBe(SITE_URL);
    expect(absoluteUrl('')).toBe(SITE_URL);
  });

  it('adds a leading slash to relative paths', () => {
    expect(absoluteUrl('research')).toBe(`${SITE_URL}/research`);
  });

  it('strips a trailing slash', () => {
    expect(absoluteUrl('/research/')).toBe(`${SITE_URL}/research`);
  });

  it('passes through already-absolute URLs unchanged', () => {
    expect(absoluteUrl('https://cdn.example.com/x.png')).toBe('https://cdn.example.com/x.png');
  });
});

describe('structured data', () => {
  it('organizationSchema is an Organization with a name and url', () => {
    const s = organizationSchema() as Record<string, unknown>;
    expect(s['@type']).toBe('Organization');
    expect(s.name).toBeTruthy();
    expect(s.url).toBe(SITE_URL);
  });

  it('websiteSchema is a WebSite with a search action', () => {
    const s = websiteSchema() as Record<string, unknown>;
    expect(s['@type']).toBe('WebSite');
    expect(s.potentialAction).toBeTruthy();
  });

  it('productSchema carries name, price offer, and canonical url', () => {
    const s = productSchema({
      name: 'PLP Slim 2.0',
      description: 'Tirzepatide + Cagrilintide',
      image: 'https://cdn/x.png',
      price: 4500,
      slug: 'plp-slim-2-0',
      available: true,
    }) as Record<string, any>;
    expect(s['@type']).toBe('Product');
    expect(s.name).toBe('PLP Slim 2.0');
    expect(s.offers.price).toBe(4500);
    expect(s.offers.availability).toContain('InStock');
    expect(s.url).toBe(`${SITE_URL}/products/plp-slim-2-0`);
  });

  it('productSchema marks unavailable products OutOfStock', () => {
    const s = productSchema({ name: 'X', slug: 'x', price: 100, available: false }) as Record<string, any>;
    expect(s.offers.availability).toContain('OutOfStock');
  });
});
