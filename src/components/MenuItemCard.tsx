import React, { useState } from 'react';
import { Heart, Package } from 'lucide-react';
import type { Product, ProductVariation, KitType } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';

interface MenuItemCardProps {
  product: Product;
  onAddToCart?: (product: Product, variation?: ProductVariation, quantity?: number, kitType?: KitType) => void;
  cartQuantity?: number;
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onProductClick?: (product: Product) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  product,
  onAddToCart,
  cartQuantity = 0,
  onProductClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | undefined>(
    product.variations && product.variations.length > 0 ? product.variations[0] : undefined
  );
  const [kitType, setKitType] = useState<KitType>('vial_only');

  // Calculate current price considering both product and variation discounts
  const basePrice = (() => {
    return selectedVariation
      ? (selectedVariation.discount_active && selectedVariation.discount_price)
        ? selectedVariation.discount_price
        : selectedVariation.price
      : (product.discount_active && product.discount_price)
        ? product.discount_price
        : product.base_price;
  })();

  // Don't add kit upgrade price if variation is already a kit
  const isSelectedKitVariation = selectedVariation?.name?.toLowerCase().includes('kit');
  const currentPrice = basePrice + (kitType === 'complete_kit' && !isSelectedKitVariation ? KIT_UPGRADE_PRICE : 0);

  // Check if there's an active discount
  const hasDiscount = selectedVariation
    ? (selectedVariation.discount_active && selectedVariation.discount_price !== null)
    : (product.discount_active && product.discount_price !== null);

  // Get original price for strikethrough
  const originalPrice = (selectedVariation ? selectedVariation.price : product.base_price) + (kitType === 'complete_kit' && !isSelectedKitVariation ? KIT_UPGRADE_PRICE : 0);

  // Check if product has any available stock
  const hasAnyStock = product.variations && product.variations.length > 0
    ? product.variations.some(v => v.stock_quantity > 0)
    : product.stock_quantity > 0;

  // Check if this is an individual/accessory item (no kit option)
  const isSetProduct = product.inclusions && product.inclusions.length > 0;

  // If variation is a "Kit (10 Vials)" type, it's already a kit - no toggle needed
  const isKitVariation = selectedVariation?.name?.toLowerCase().includes('kit');

  // Show kit toggle only for set products where the selected variation is NOT already a kit
  const showKitToggle = isSetProduct && !isKitVariation;

  return (
    <div className="card !p-0 h-full flex flex-col group relative overflow-hidden">
      {/* Click overlay for product details */}
      <div
        onClick={() => onProductClick?.(product)}
        className="absolute inset-0 z-10 cursor-pointer"
        title="View details"
      />

      {/* Product Image */}
      <div className="relative h-44 sm:h-64 overflow-hidden border-b border-brand-100" style={{ background: 'linear-gradient(135deg, #EAF4FA, #D6EAF5)' }}>
        {product.image_url && !imageError ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-200" style={{ background: 'linear-gradient(135deg, #EAF4FA, #D6EAF5)' }}>
            <Heart className="w-16 h-16 opacity-30" fill="currentColor" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none z-20">
          {product.featured && (
            <span className="px-2 py-1 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm" style={{ background: 'linear-gradient(135deg, #D4A554, #5FA8C8)' }}>
              Featured
            </span>
          )}
          {hasDiscount && (
            <span className="px-2 py-1 text-white text-[10px] font-bold rounded-full shadow-sm" style={{ background: 'linear-gradient(135deg, #5FA8C8, #4A93B5)' }}>
              {Math.round((1 - basePrice / (selectedVariation ? selectedVariation.price : product.base_price)) * 100)}% OFF
            </span>
          )}
        </div>

        {/* Stock Status Overlay */}
        {(!product.available || !hasAnyStock) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center z-20">
            <span className="bg-brand-50 text-brand-600 px-3 py-1 text-xs font-bold rounded-full border border-brand-200 uppercase tracking-wide">
              {!product.available ? 'Unavailable' : 'Out of Stock'}
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-2.5 sm:p-5 flex-1 flex flex-col">
        <h3 className="font-heading font-semibold text-charcoal-900 text-xs sm:text-base mb-0.5 sm:mb-1 line-clamp-1 sm:line-clamp-2 tracking-tight">
          {product.name}
        </h3>
        <p className="text-[9px] sm:text-xs text-charcoal-400 mb-1.5 sm:mb-3 line-clamp-1 sm:line-clamp-2 min-h-[1rem] sm:min-h-[2.5rem] leading-relaxed font-cute">
          {product.description}
        </p>

        {/* Variations (Sizes) */}
        <div className="mb-1.5 sm:mb-3 min-h-[1.25rem] sm:min-h-[2rem]">
          {product.variations && product.variations.length > 0 && (
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {product.variations.slice(0, 2).map((variation) => {
                const isOutOfStock = variation.stock_quantity === 0;
                return (
                  <button
                    key={variation.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOutOfStock) {
                        setSelectedVariation(variation);
                      }
                    }}
                    disabled={isOutOfStock}
                    className={`
                      px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded-full border transition-all duration-200 relative z-20
                      ${selectedVariation?.id === variation.id && !isOutOfStock
                        ? 'bg-brand-50 border-brand-400 text-brand-700'
                        : isOutOfStock
                          ? 'bg-charcoal-50 text-charcoal-300 border-charcoal-100 cursor-not-allowed'
                          : 'bg-white text-charcoal-600 border-brand-200 hover:border-brand-400 hover:text-brand-600'
                      }
                    `}
                  >
                    {variation.name}
                  </button>
                );
              })}
              {product.variations.length > 2 && (
                <span className="text-[9px] sm:text-[10px] text-charcoal-300 self-center">
                  +{product.variations.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Kit Type Toggle - Only for set products with single vial selected */}
        {showKitToggle && (
          <div className="mb-1.5 sm:mb-3 relative z-20">
            <div className="flex rounded-full border border-brand-200 overflow-hidden text-[10px] sm:text-xs font-medium">
              <button
                onClick={(e) => { e.stopPropagation(); setKitType('vial_only'); }}
                className={`flex-1 py-1.5 px-2 transition-all text-center ${
                  kitType === 'vial_only'
                    ? 'bg-brand-500 text-white'
                    : 'bg-white text-charcoal-600 hover:bg-brand-50'
                }`}
              >
                Vial Only
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setKitType('complete_kit'); }}
                className={`flex-1 py-1.5 px-2 transition-all text-center ${
                  kitType === 'complete_kit'
                    ? 'bg-brand-500 text-white'
                    : 'bg-white text-charcoal-600 hover:bg-brand-50'
                }`}
              >
                Kit +₱{KIT_UPGRADE_PRICE}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Price and Cart Actions */}
        <div className="flex flex-col gap-1.5 sm:gap-3 mt-auto">
          {hasDiscount ? (
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-sm sm:text-lg font-semibold text-charcoal-900">
                ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
              </span>
              <span className="text-[9px] sm:text-xs text-charcoal-300 line-through">
                ₱{originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
              </span>
            </div>
          ) : (
            <div className="flex items-baseline">
              <span className="text-sm sm:text-lg font-semibold text-charcoal-900">
                ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
              </span>
            </div>
          )}

          <div className="flex w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!product.available || !hasAnyStock) return;

                if (product.variations && product.variations.length > 0 && !selectedVariation) {
                  onProductClick?.(product);
                  return;
                }

                // Kit variations are always 'vial_only' (no +₱150 since they're already a kit)
                const effectiveKitType = selectedVariation?.name?.toLowerCase().includes('kit') ? 'vial_only' : kitType;
                onAddToCart?.(product, selectedVariation, 1, effectiveKitType);
              }}
              disabled={!product.available || !hasAnyStock}
              className={`relative z-20 w-full py-2 sm:py-3 text-[10px] sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 font-semibold transition-all rounded-xl sm:rounded-2xl
                ${(!product.available || !hasAnyStock)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'btn-primary'}
              `}
            >
              <Heart className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" />
              <span>Add to Cart</span>
            </button>
          </div>

          {cartQuantity > 0 && (
            <div className="text-center text-[10px] text-brand-600 font-medium bg-brand-50 rounded-full py-1">
              {cartQuantity} in cart
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
