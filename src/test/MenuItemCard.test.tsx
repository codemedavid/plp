import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MenuItemCard from '../components/MenuItemCard';
import type { Product, ProductVariation } from '../types';

// ─────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────

const baseProduct: Product = {
  id: 'prod-1',
  name: 'Tirzepatide 5mg',
  description: 'High-purity research peptide',
  category: 'peptides',
  base_price: 2500,
  discount_price: null,
  discount_start_date: null,
  discount_end_date: null,
  discount_active: false,
  purity_percentage: 99,
  molecular_weight: '4813.45',
  cas_number: null,
  sequence: null,
  storage_conditions: 'Store at -20°C',
  inclusions: null,
  stock_quantity: 10,
  available: true,
  featured: false,
  image_url: null,
  safety_sheet_url: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const variation5mg: ProductVariation = {
  id: 'var-1',
  product_id: 'prod-1',
  name: '5mg',
  quantity_mg: 5,
  price: 3000,
  disposable_pen_price: null,
  reusable_pen_price: null,
  discount_price: 2500,
  discount_active: true,
  stock_quantity: 5,
  created_at: '2024-01-01',
};

const variation10mg: ProductVariation = {
  id: 'var-2',
  product_id: 'prod-1',
  name: '10mg',
  quantity_mg: 10,
  price: 5000,
  disposable_pen_price: null,
  reusable_pen_price: null,
  discount_price: null,
  discount_active: false,
  stock_quantity: 3,
  created_at: '2024-01-01',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────
// Integration Tests: MenuItemCard Component
// ─────────────────────────────────────────────────────

// The 8.8 promo (Aug 7-11 PHT) halves every price, so card pricing depends on
// the wall clock. Pin it off-promo by default and opt in per-block, otherwise
// these assertions would silently change meaning during the sale.
const DURING_PROMO = new Date('2026-08-09T12:00:00+08:00');
const OFF_PROMO = new Date('2026-09-01T00:00:00+08:00');

describe('MenuItemCard Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(OFF_PROMO);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('8.8 promo pricing', () => {
    it('halves the displayed price during the promo window', () => {
      vi.setSystemTime(DURING_PROMO);

      render(<MenuItemCard product={baseProduct} />);

      expect(screen.getByText(/₱1,250/)).toBeInTheDocument();
    });

    it('shows a 50% Off badge during the promo', () => {
      vi.setSystemTime(DURING_PROMO);

      render(<MenuItemCard product={baseProduct} />);

      expect(screen.getByText(/50% Off/i)).toBeInTheDocument();
    });

    it('halves base price rather than honouring a shallower sale price', () => {
      vi.setSystemTime(DURING_PROMO);
      const shallowSale = { ...baseProduct, discount_active: true, discount_price: 2000 };

      render(<MenuItemCard product={shallowSale} />);

      // base 2500 -> promo 1250 beats the 2000 sale price
      expect(screen.getByText(/₱1,250/)).toBeInTheDocument();
    });

    it('reverts to list pricing once the promo expires', () => {
      vi.setSystemTime(new Date('2026-08-12T00:00:00+08:00'));

      render(<MenuItemCard product={baseProduct} />);

      expect(screen.getByText(/₱2,500/)).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('displays product name', () => {
      render(<MenuItemCard product={baseProduct} />);

      expect(screen.getByText('Tirzepatide 5mg')).toBeInTheDocument();
    });

    it('shows base price when no discount and no variations', () => {
      render(<MenuItemCard product={baseProduct} />);

      expect(screen.getByText(/₱2,500/)).toBeInTheDocument();
    });

    it('shows discounted price when discount active', () => {
      const discountedProduct = {
        ...baseProduct,
        discount_active: true,
        discount_price: 2000,
      };

      render(<MenuItemCard product={discountedProduct} />);

      expect(screen.getByText(/₱2,000/)).toBeInTheDocument();
    });

    it('shows Featured badge for featured products', () => {
      const featuredProduct = { ...baseProduct, featured: true };

      render(<MenuItemCard product={featuredProduct} />);

      expect(screen.getByText(/Featured/)).toBeInTheDocument();
    });

    it('shows discount percentage badge', () => {
      const discountedProduct = {
        ...baseProduct,
        discount_active: true,
        discount_price: 2000,
      };

      render(<MenuItemCard product={discountedProduct} />);

      expect(screen.getByText(/20% Off/i)).toBeInTheDocument();
    });

    it('shows Out of Stock overlay when no stock', () => {
      const outOfStockProduct = { ...baseProduct, stock_quantity: 0 };

      render(<MenuItemCard product={outOfStockProduct} />);

      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('shows Unavailable overlay when product unavailable', () => {
      const unavailableProduct = { ...baseProduct, available: false };

      render(<MenuItemCard product={unavailableProduct} />);

      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    it('shows category', () => {
      render(<MenuItemCard product={baseProduct} />);

      expect(screen.getByText(/peptides/i)).toBeInTheDocument();
    });

    it('shows From label on price', () => {
      render(<MenuItemCard product={baseProduct} />);

      expect(screen.getByText(/From/i)).toBeInTheDocument();
    });
  });

  describe('Variations pricing', () => {
    it('shows min variation price as From price', () => {
      const productWithVariations = {
        ...baseProduct,
        variations: [variation5mg, variation10mg],
      };

      render(<MenuItemCard product={productWithVariations} />);

      // Minimum effective price across variations: variation5mg discount 2500
      expect(screen.getByText(/₱2,500/)).toBeInTheDocument();
    });
  });

  describe('View button', () => {
    it('renders View button', () => {
      render(<MenuItemCard product={baseProduct} />);

      expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument();
    });

    it('disables View button when out of stock', () => {
      const outOfStockProduct = { ...baseProduct, stock_quantity: 0 };

      render(<MenuItemCard product={outOfStockProduct} />);

      expect(screen.getByRole('button', { name: /View/i })).toBeDisabled();
    });

    it('disables View button when unavailable', () => {
      const unavailableProduct = { ...baseProduct, available: false };

      render(<MenuItemCard product={unavailableProduct} />);

      expect(screen.getByRole('button', { name: /View/i })).toBeDisabled();
    });

    it('calls onProductClick when View button clicked', () => {
      const onProductClick = vi.fn();

      render(<MenuItemCard product={baseProduct} onProductClick={onProductClick} />);

      fireEvent.click(screen.getByRole('button', { name: /View/i }));

      expect(onProductClick).toHaveBeenCalledWith(baseProduct);
    });
  });

  describe('Product click', () => {
    it('calls onProductClick when card clicked', () => {
      const onProductClick = vi.fn();

      render(<MenuItemCard product={baseProduct} onProductClick={onProductClick} />);

      fireEvent.click(screen.getByText('Tirzepatide 5mg'));

      expect(onProductClick).toHaveBeenCalledWith(baseProduct);
    });
  });

  describe('COA links', () => {
    it('renders no COA control when the product has no COA', () => {
      render(<MenuItemCard product={baseProduct} />);

      expect(screen.queryByRole('link', { name: /coa/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /coa/i })).not.toBeInTheDocument();
    });

    it('renders a direct COA link for a single legacy coa_url', () => {
      const product = {
        ...baseProduct,
        coa_url: 'https://verify.janoshik.com/tests/113255',
      } as Product;

      render(<MenuItemCard product={product} />);

      expect(screen.getByRole('link', { name: /coa/i })).toHaveAttribute(
        'href',
        'https://verify.janoshik.com/tests/113255',
      );
    });

    it('renders a COA menu listing each labeled document', () => {
      const product = {
        ...baseProduct,
        coa_links: [
          { label: 'Purity Test', url: 'https://verify.janoshik.com/tests/113255' },
          { label: 'Heavy Metal Testing', url: 'https://verify.janoshik.com/tests/113135' },
        ],
      } as Product;

      render(<MenuItemCard product={product} />);

      fireEvent.click(screen.getByRole('button', { name: /coa/i }));

      expect(screen.getByRole('menuitem', { name: /purity test/i })).toHaveAttribute(
        'href',
        'https://verify.janoshik.com/tests/113255',
      );
      expect(screen.getByRole('menuitem', { name: /heavy metal testing/i })).toHaveAttribute(
        'href',
        'https://verify.janoshik.com/tests/113135',
      );
    });
  });
});
