import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductSpotlight, { ROTATE_MS } from '../components/research/ProductSpotlight';
import { slugify } from '../lib/slug';
import type { Product } from '../types';

function mkProduct(over: Partial<Product>): Product {
  return {
    id: 'id',
    name: 'Product',
    base_price: 1000,
    image_url: null,
    available: true,
    featured: false,
    ...over,
  } as unknown as Product;
}

const products = [
  mkProduct({ id: 'p1', name: 'PLP Slim 2.0', image_url: 'https://cdn/x/slim.jpg' }),
  mkProduct({ id: 'p2', name: 'BPC-157', image_url: 'https://cdn/x/bpc.jpg' }),
  mkProduct({ id: 'p3', name: 'GHK-Cu Serum', image_url: null }),
];

function setMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderSpotlight(list: Product[]) {
  return render(
    <MemoryRouter>
      <ProductSpotlight products={list} />
    </MemoryRouter>,
  );
}

describe('ProductSpotlight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setMatchMedia(false);
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders nothing when there are no products', () => {
    const { container } = renderSpotlight([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the first product with its image and a VIEW PRODUCT link', () => {
    renderSpotlight(products);
    expect(screen.getByText('PLP Slim 2.0')).toBeInTheDocument();
    const img = screen.getByRole('img', { name: /plp slim 2\.0/i });
    expect(img).toHaveAttribute('src', 'https://cdn/x/slim.jpg');
    expect(screen.getByRole('link', { name: /view product/i })).toHaveAttribute(
      'href',
      `/products/${slugify('PLP Slim 2.0')}`,
    );
  });

  it('auto-advances to the next product after the rotation interval', () => {
    renderSpotlight(products);
    expect(screen.getByText('PLP Slim 2.0')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(ROTATE_MS);
    });
    expect(screen.getByText('BPC-157')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view product/i })).toHaveAttribute(
      'href',
      `/products/${slugify('BPC-157')}`,
    );
  });

  it('wraps around to the first product after the last', () => {
    renderSpotlight(products);
    act(() => {
      vi.advanceTimersByTime(ROTATE_MS * products.length);
    });
    expect(screen.getByText('PLP Slim 2.0')).toBeInTheDocument();
  });

  it('does not auto-advance under prefers-reduced-motion', () => {
    setMatchMedia(true);
    renderSpotlight(products);
    act(() => {
      vi.advanceTimersByTime(ROTATE_MS * 3);
    });
    expect(screen.getByText('PLP Slim 2.0')).toBeInTheDocument();
  });

  it('falls back to a placeholder when a product has no image', () => {
    renderSpotlight([products[2]]);
    expect(screen.getByText('GHK-Cu Serum')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
