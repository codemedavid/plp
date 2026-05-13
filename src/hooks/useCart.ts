import { useState, useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import type { CartItem, Product, ProductVariation, KitType } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';
import { getEffectiveUnitPrice } from '../lib/bundlePricing';

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const savedCart = localStorage.getItem('peptide_cart');
    if (!savedCart) return [];
    try {
      const parsed = JSON.parse(savedCart);
      return parsed.map((item: CartItem) => ({
        ...item,
        kitType: item.kitType || 'vial_only',
      }));
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return [];
    }
  });

  const isFirstRender = useRef(true);

  // Save cart to localStorage whenever it changes (skip first render to avoid overwriting loaded state)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    localStorage.setItem('peptide_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: Product, variation?: ProductVariation, quantity: number = 1, kitType: KitType = 'vial_only') => {
    // Check stock availability
    const availableStock = variation ? variation.stock_quantity : product.stock_quantity;

    if (availableStock === 0) {
      alert(`Sorry, ${product.name}${variation ? ` ${variation.name}` : ''} is out of stock.`);
      return;
    }

    // Find existing item matching product, variation, AND kitType
    const existingItemIndex = cartItems.findIndex(
      item => item.product.id === product.id &&
        (variation ? item.variation?.id === variation.id : !item.variation) &&
        item.kitType === kitType
    );

    // Calculate the actual price the customer pays (respecting discounts and kit upgrades)
    const basePrice = variation
      ? (variation.discount_active && variation.discount_price != null ? variation.discount_price : variation.price)
      : (product.discount_active && product.discount_price != null ? product.discount_price : product.base_price);
    const kitUpgrade = kitType === 'complete_kit' ? KIT_UPGRADE_PRICE : 0;
    const actualPrice = basePrice + kitUpgrade;

    if (existingItemIndex > -1) {
      const currentQuantity = cartItems[existingItemIndex].quantity;
      const newQuantity = currentQuantity + quantity;

      if (newQuantity > availableStock) {
        const remainingStock = availableStock - currentQuantity;
        if (remainingStock > 0) {
          alert(`Only ${remainingStock} item(s) available in stock. Added ${remainingStock} to your cart.`);
          quantity = remainingStock;
        } else {
          alert(`Sorry, you already have the maximum available quantity (${currentQuantity}) in your cart.`);
          return;
        }
      }

      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex].quantity += quantity;
      setCartItems(updatedItems);
      posthog.capture('plp_add_to_cart', {
        product_name: product.name,
        product_id: product.id,
        variation: variation?.name,
        quantity,
        price: actualPrice,
        kit_type: kitType,
      });
    } else {
      if (quantity > availableStock) {
        alert(`Only ${availableStock} item(s) available in stock. Added ${availableStock} to your cart.`);
        quantity = availableStock;
      }

      const newItem: CartItem = {
        product,
        variation,
        kitType,
        quantity
      };
      setCartItems([...cartItems, newItem]);
      posthog.capture('plp_add_to_cart', {
        product_name: product.name,
        product_id: product.id,
        variation: variation?.name,
        quantity,
        price: actualPrice,
        kit_type: kitType,
      });
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cartItems[index];
    const availableStock = item.variation ? item.variation.stock_quantity : item.product.stock_quantity;

    if (quantity > availableStock) {
      alert(`Only ${availableStock} item(s) available in stock.`);
      quantity = availableStock;
    }

    const updatedItems = [...cartItems];
    updatedItems[index].quantity = quantity;
    setCartItems(updatedItems);
  };

  const removeFromCart = (index: number) => {
    const updatedItems = cartItems.filter((_, i) => i !== index);
    setCartItems(updatedItems);
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('peptide_cart');
  };

  const getItemPrice = (item: CartItem) =>
    getEffectiveUnitPrice(item.product, item.variation, item.kitType, item.quantity);

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      return total + (getItemPrice(item) * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  return {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getItemPrice
  };
}
