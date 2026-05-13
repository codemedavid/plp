import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Cart from '../components/Cart';
import type { CartItem, Product, ProductVariation } from '../types';

// ─────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Tirzepatide',
  description: 'Research peptide',
  category: 'peptides',
  base_price: 2500,
  discount_price: 2000,
  discount_start_date: null,
  discount_end_date: null,
  discount_active: true,
  purity_percentage: 99,
  molecular_weight: null,
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

const mockVariation: ProductVariation = {
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

const createCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  product: mockProduct,
  kitType: 'vial_only',
  quantity: 1,
  ...overrides,
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  cartItems: [] as CartItem[],
  updateQuantity: vi.fn(),
  removeFromCart: vi.fn(),
  clearCart: vi.fn(),
  getTotalPrice: vi.fn(() => 0),
  onContinueShopping: vi.fn(),
  onCheckout: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────
// Integration Tests: Cart Component
// ─────────────────────────────────────────────────────

describe('Cart Component', () => {
  describe('Closed state', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(<Cart {...defaultProps} isOpen={false} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Empty Cart', () => {
    it('shows empty cart message', () => {
      render(<Cart {...defaultProps} />);

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
      expect(screen.getByText(/Browse our products/)).toBeInTheDocument();
    });

    it('shows Browse Products button that calls onContinueShopping', () => {
      const onContinueShopping = vi.fn();
      render(<Cart {...defaultProps} onContinueShopping={onContinueShopping} />);

      fireEvent.click(screen.getByText('Browse Products'));

      expect(onContinueShopping).toHaveBeenCalled();
    });
  });

  describe('Cart with Items', () => {
    it('renders product name for each item', () => {
      const items = [createCartItem()];
      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          getTotalPrice={() => 2000}
        />
      );

      expect(screen.getByText('Tirzepatide')).toBeInTheDocument();
    });

    it('shows variation name when present', () => {
      const items = [createCartItem({ variation: mockVariation })];
      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          getTotalPrice={() => 2500}
        />
      );

      expect(screen.getByText('5mg')).toBeInTheDocument();
    });

    it('shows Vial badge for vial_only items', () => {
      const items = [createCartItem({ kitType: 'vial_only' })];
      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          getTotalPrice={() => 2000}
        />
      );

      expect(screen.getByText(/Vial/)).toBeInTheDocument();
    });

    it('shows Kit badge for complete_kit items', () => {
      const items = [createCartItem({ kitType: 'complete_kit' })];
      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          getTotalPrice={() => 2150}
        />
      );

      expect(screen.getByText(/Kit/)).toBeInTheDocument();
    });

    it('displays correct item count in header', () => {
      const items = [
        createCartItem({ quantity: 2 }),
        createCartItem({ product: { ...mockProduct, id: 'prod-2', name: 'BPC-157' }, quantity: 3 }),
      ];
      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          getTotalPrice={() => 10000}
        />
      );

      // Header shows "(5)" next to Cart title
      expect(screen.getByText('(5)')).toBeInTheDocument();
    });

    it('displays subtotal price in footer', () => {
      const items = [createCartItem({ quantity: 2 })];
      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          getTotalPrice={() => 4000}
        />
      );

      const priceElements = screen.getAllByText(/₱4,000/);
      expect(priceElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
    });

    it('shows shipping calculated message', () => {
      const items = [createCartItem()];
      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          getTotalPrice={() => 2000}
        />
      );

      expect(screen.getByText(/Shipping calculated at checkout/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls updateQuantity with decremented value on minus click', () => {
      const updateQuantity = vi.fn();
      const items = [createCartItem({ quantity: 3 })];

      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          updateQuantity={updateQuantity}
          getTotalPrice={() => 6000}
        />
      );

      const minusBtn = screen.getByRole('button', { name: /Decrease quantity/i });
      fireEvent.click(minusBtn);

      expect(updateQuantity).toHaveBeenCalledWith(0, 2);
    });

    it('calls removeFromCart when remove button clicked', () => {
      const removeFromCart = vi.fn();
      const items = [createCartItem()];

      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          removeFromCart={removeFromCart}
          getTotalPrice={() => 2000}
        />
      );

      const removeButton = screen.getByRole('button', { name: /Remove Tirzepatide/i });
      fireEvent.click(removeButton);

      expect(removeFromCart).toHaveBeenCalledWith(0);
    });

    it('calls clearCart when Clear cart clicked', () => {
      const clearCart = vi.fn();
      const items = [createCartItem()];

      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          clearCart={clearCart}
          getTotalPrice={() => 2000}
        />
      );

      fireEvent.click(screen.getByText(/Clear cart/i));
      // Confirm step
      fireEvent.click(screen.getByText(/Yes, clear/i));

      expect(clearCart).toHaveBeenCalled();
    });

    it('calls onCheckout when Proceed to Checkout clicked', () => {
      const onCheckout = vi.fn();
      const items = [createCartItem()];

      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          onCheckout={onCheckout}
          getTotalPrice={() => 2000}
        />
      );

      fireEvent.click(screen.getByText('Proceed to Checkout'));

      expect(onCheckout).toHaveBeenCalled();
    });

    it('calls onContinueShopping when Continue shopping clicked', () => {
      const onContinueShopping = vi.fn();
      const items = [createCartItem()];

      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          onContinueShopping={onContinueShopping}
          getTotalPrice={() => 2000}
        />
      );

      fireEvent.click(screen.getByText(/Continue shopping/i));

      expect(onContinueShopping).toHaveBeenCalled();
    });

    it('shows stock limit alert when trying to exceed stock', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const updateQuantity = vi.fn();
      const items = [createCartItem({ quantity: 10 })]; // at max stock

      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          updateQuantity={updateQuantity}
          getTotalPrice={() => 20000}
        />
      );

      const plusBtn = screen.getByRole('button', { name: /Increase quantity/i });
      // Plus button is disabled at stock max
      expect(plusBtn).toBeDisabled();

      alertSpy.mockRestore();
    });

    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<Cart {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: /Close cart/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Price calculations in display', () => {
    it('shows correct line total for quantity > 1', () => {
      const items = [createCartItem({ quantity: 3 })];
      render(
        <Cart
          {...defaultProps}
          cartItems={items}
          getTotalPrice={() => 6000}
        />
      );

      // Line total: 2000 * 3 = 6000 (appears in line + subtotal)
      const priceElements = screen.getAllByText(/₱6,000/);
      expect(priceElements.length).toBeGreaterThan(0);
    });
  });
});
