import React, { useState } from 'react';
import { Heart, Shield } from 'lucide-react';
import type { Product, ProductVariation, KitType } from '../types';
import { useCOAProductNames } from '../hooks/useCOAProductNames';
import { useCOAPageSetting } from '../hooks/useCOAPageSetting';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const cleanText = (s?: string | null) =>
  (s ?? '').replace(UUID_RE, '').replace(/\s{2,}/g, ' ').trim();

interface MenuItemCardProps {
  product: Product;
  onAddToCart?: (product: Product, variation?: ProductVariation, quantity?: number, kitType?: KitType) => void;
  cartQuantity?: number;
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onProductClick?: (product: Product) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ product, onProductClick }) => {
  const [imageError, setImageError] = useState(false);
  const { hasCOA } = useCOAProductNames();
  const { coaPageEnabled } = useCOAPageSetting();
  const productHasCOA = coaPageEnabled && hasCOA(cleanText(product.name));

  const effectivePrice = (v: ProductVariation) =>
    v.discount_active && v.discount_price != null ? v.discount_price : v.price;

  const productEffective =
    product.discount_active && product.discount_price != null ? product.discount_price : product.base_price;

  const fromPrice =
    product.variations && product.variations.length > 0
      ? Math.min(...product.variations.map(effectivePrice))
      : productEffective;

  const fromOriginalPrice =
    product.variations && product.variations.length > 0
      ? Math.min(...product.variations.map((v) => v.price))
      : product.base_price;

  const hasDiscount = fromPrice < fromOriginalPrice;
  const discountPct = hasDiscount ? Math.round((1 - fromPrice / fromOriginalPrice) * 100) : 0;

  const hasAnyStock =
    product.variations && product.variations.length > 0
      ? product.variations.some((v) => v.stock_quantity > 0)
      : product.stock_quantity > 0;

  const isUnavailable = !product.available || !hasAnyStock;

  const handleClick = () => onProductClick?.(product);

  // The inner "View" button is the single focusable / role="button" interactive control.
  // The outer card is a non-interactive visual surface that forwards bubbled clicks for
  // mouse convenience, but keyboard users tab to the inner button (no nested interactives).
  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-2xl border border-charcoal-100 overflow-hidden flex flex-col h-full cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
        product.featured
          ? 'ring-2 ring-gold-500/60 hover:ring-gold-500 shadow-[0_4px_20px_rgba(201,168,118,0.18)]'
          : 'shadow-sm'
      }`}
    >
      {/* Image area with navy wave bottom */}
      <div className="relative aspect-square overflow-hidden" style={{ background: 'linear-gradient(135deg, #EAF4FA, #D6EAF5)' }}>
        {product.image_url && !imageError ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 relative z-10"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-200 relative z-10">
            <Heart className="w-16 h-16 opacity-30" fill="currentColor" />
          </div>
        )}

        {/* Navy curved wave at the bottom of the image */}
        <svg
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-[18%] z-20"
          aria-hidden="true"
        >
          <path d="M0,30 Q200,80 400,20 L400,60 L0,60 Z" fill="#0F2447" />
        </svg>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none z-30">
          {product.featured && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-gold-600 to-gold-500 text-white text-[9px] font-semibold uppercase tracking-[0.18em] shadow-md shadow-gold-500/30 border border-gold-400 rounded-full">
              ★ Featured
            </span>
          )}
          {hasDiscount && (
            <span className="px-2.5 py-1 bg-navy-900 text-white text-[9px] font-semibold uppercase tracking-[0.18em] rounded-full">
              {discountPct}% Off
            </span>
          )}
        </div>

        {/* Stock Status Overlay */}
        {isUnavailable && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center z-30">
            <span className="bg-brand-50 text-brand-600 px-3 py-1 text-xs font-bold rounded-full border border-brand-200 uppercase tracking-wide">
              {!product.available ? 'Unavailable' : 'Out of Stock'}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-heading font-semibold text-charcoal-900 text-sm sm:text-base line-clamp-2 tracking-tight leading-snug flex-1">
            {cleanText(product.name)}
          </h3>
          <div className="text-right shrink-0">
            <p className="text-[9px] sm:text-[10px] text-charcoal-400 uppercase tracking-wider leading-none mb-0.5">
              From
            </p>
            <p className="text-sm sm:text-base font-bold text-brand-600 leading-none">
              ₱{fromPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {product.category && (
          <p className="text-[10px] sm:text-xs text-charcoal-400 line-clamp-1 mb-3 capitalize">
            {cleanText(product.category)}
          </p>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            disabled={isUnavailable}
            className={`flex-1 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
              isUnavailable
                ? 'bg-charcoal-100 text-charcoal-400 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow-md'
            }`}
          >
            View
          </button>
          {productHasCOA && (
            <a
              href="/coa"
              onClick={(e) => e.stopPropagation()}
              title="View Certificate of Analysis"
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2.5 sm:py-3 rounded-full border border-gold-500 text-gold-700 text-[10px] sm:text-xs font-semibold tracking-wide uppercase hover:bg-gold-500 hover:text-white transition-colors"
            >
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={1.8} />
              COA
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
