import React, { useEffect, useState } from 'react';
import { Trash2, ShoppingBag, ArrowRight, Plus, Minus, Heart, Gift, Package, X } from 'lucide-react';
import type { CartItem, Product, ProductVariation, KitType } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';
import { useRecommendations } from '../hooks/useRecommendations';
import RecommendationRail from './RecommendationRail';
import { getEffectiveUnitPrice, getMatchingBundleTier, getRegularUnitPrice } from '../lib/bundlePricing';
import Toast from './Toast';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  updateQuantity: (index: number, quantity: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  onContinueShopping: () => void;
  onCheckout: () => void;
  allProducts?: Product[];
  addToCart?: (product: Product, variation?: ProductVariation, quantity?: number, kitType?: KitType) => void;
}

const Cart: React.FC<CartProps> = ({
  isOpen,
  onClose,
  cartItems,
  updateQuantity,
  removeFromCart,
  clearCart,
  getTotalPrice,
  onContinueShopping,
  onCheckout,
  allProducts = [],
  addToCart,
}) => {
  const recommendations = useRecommendations({
    products: allProducts,
    cartItems,
    limit: 3,
  });
  const [toast, setToast] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getItemPrice = (item: CartItem) =>
    getEffectiveUnitPrice(item.product, item.variation, item.kitType, item.quantity);

  const totalPrice = getTotalPrice();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-charcoal-900/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <aside
        className="relative w-full sm:max-w-md bg-white shadow-luxury h-full flex flex-col animate-slideInRight"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-bold text-charcoal-900">Cart</h2>
            <span className="text-charcoal-400 text-sm">({itemCount})</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Empty state */}
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #EAF4FA, #D6EAF5)' }}>
              <ShoppingBag className="w-9 h-9 text-brand-400" />
            </div>
            <h3 className="font-heading text-lg font-bold text-charcoal-900 mb-2">Your cart is empty</h3>
            <p className="text-sm text-charcoal-400 mb-6 font-cute max-w-xs">
              Browse our products and add your favorites!
            </p>
            <button
              onClick={onContinueShopping}
              className="btn-primary px-6 py-2.5 rounded-2xl text-sm"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
              {cartItems.map((item, index) => {
                const itemPrice = getItemPrice(item);
                const availableStock = item.variation ? item.variation.stock_quantity : item.product.stock_quantity;
                return (
                  <div
                    key={`${item.product.id}-${item.variation?.id ?? 'novar'}-${item.kitType ?? 'vial'}-${index}`}
                    className="bg-white rounded-2xl p-3 border border-brand-100 flex gap-3"
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-16 h-16 rounded-xl flex-shrink-0 border border-brand-100 overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #EAF4FA, #D6EAF5)' }}
                    >
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-300">
                          <Heart className="w-6 h-6" fill="currentColor" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-charcoal-900 text-sm truncate">{item.product.name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.variation && (
                              <span className="text-[10px] text-charcoal-500 bg-brand-50 px-1.5 py-0.5 rounded-full border border-brand-100 font-cute">
                                {item.variation.name}
                              </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-cute ${
                              item.kitType === 'complete_kit'
                                ? 'bg-brand-100 text-brand-700 border border-brand-200'
                                : 'bg-gray-50 text-charcoal-500 border border-gray-200'
                            }`}>
                              {item.kitType === 'complete_kit' ? (
                                <><Gift className="w-2.5 h-2.5" /> Kit</>
                              ) : (
                                <><Package className="w-2.5 h-2.5" /> Vial</>
                              )}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          aria-label={`Remove ${item.product.name}`}
                          className="text-charcoal-300 hover:text-red-400 transition-colors p-0.5 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-brand-200 rounded-lg bg-brand-50">
                          <button
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="p-1.5 hover:bg-brand-100 rounded-l-lg text-brand-600 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-bold text-charcoal-900 text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              if (item.quantity >= availableStock) {
                                setToast(`Only ${availableStock} item(s) available in stock.`);
                                return;
                              }
                              updateQuantity(index, item.quantity + 1);
                            }}
                            disabled={item.quantity >= availableStock}
                            className="p-1.5 hover:bg-brand-100 rounded-r-lg text-brand-600 transition-colors disabled:opacity-50"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          {(() => {
                            const lineTotal = itemPrice * item.quantity;
                            const tier = getMatchingBundleTier(item.product, item.quantity);
                            const kitUpgradePerUnit = item.kitType === 'complete_kit' ? KIT_UPGRADE_PRICE : 0;
                            const fullTotal = tier
                              ? (getRegularUnitPrice(item.product, item.variation) + kitUpgradePerUnit) * item.quantity
                              : lineTotal;
                            const showSavings = tier != null && lineTotal < fullTotal;
                            const pct = showSavings ? Math.round((1 - lineTotal / fullTotal) * 100) : 0;
                            return (
                              <>
                                {showSavings && (
                                  <div className="text-[10px] text-charcoal-300 line-through">
                                    ₱{fullTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                  </div>
                                )}
                                <div className="text-sm font-bold text-charcoal-900">
                                  ₱{lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                </div>
                                {showSavings && (
                                  <div className="text-[10px] font-bold text-emerald-600">SAVE {pct}%</div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Cross-sell rail */}
              {addToCart && recommendations.length > 0 && (
                <div className="pt-2">
                  <RecommendationRail
                    products={recommendations}
                    title="Don't forget"
                    variant="compact"
                    placement="cart"
                    onAddToCart={addToCart}
                  />
                </div>
              )}

              {confirmClear ? (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="text-xs text-charcoal-500 font-cute">Clear all items?</span>
                  <button
                    onClick={() => { clearCart(); setConfirmClear(false); }}
                    className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded font-cute"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-xs px-2 py-1 border border-charcoal-200 text-charcoal-600 hover:bg-charcoal-50 rounded font-cute"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1 mx-auto mt-3 font-cute"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear cart
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-brand-100 px-5 py-4 flex-shrink-0 bg-white">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-heading font-bold text-charcoal-900">Subtotal</span>
                <span className="text-2xl font-bold text-charcoal-900">
                  ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                </span>
              </div>
              <p className="text-xs text-charcoal-400 text-right font-cute mb-4">
                Shipping calculated at checkout
              </p>

              <button
                onClick={onCheckout}
                className="w-full btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold mb-2"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onContinueShopping}
                className="w-full py-2.5 rounded-2xl text-sm font-medium text-charcoal-500 hover:text-brand-600 hover:bg-brand-50 transition-colors font-cute"
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </aside>
      {toast && <Toast message={toast} variant="warning" onClose={() => setToast(null)} />}
    </div>
  );
};

export default Cart;
