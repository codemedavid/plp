import React, { useEffect, useRef } from 'react';
import { Sparkles, Plus, Heart } from 'lucide-react';
import posthog from 'posthog-js';
import type { Product, ProductVariation, KitType } from '../types';

interface RecommendationRailProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'compact';
  placement: 'cart' | 'pdp' | 'checkout';
  onAddToCart: (
    product: Product,
    variation?: ProductVariation,
    quantity?: number,
    kitType?: KitType
  ) => void;
  onProductClick?: (product: Product) => void;
}

const getDisplayPrice = (product: Product): { price: number; original: number | null } => {
  // Prefer cheapest in-stock variation if available
  if (product.variations && product.variations.length > 0) {
    const inStock = product.variations.filter((v) => v.stock_quantity > 0);
    const pool = inStock.length > 0 ? inStock : product.variations;
    const cheapest = pool.reduce((min, v) => (v.price < min.price ? v : min), pool[0]);
    const effective =
      cheapest.discount_active && cheapest.discount_price != null
        ? cheapest.discount_price
        : cheapest.price;
    return {
      price: effective,
      original: effective < cheapest.price ? cheapest.price : null,
    };
  }
  const effective =
    product.discount_active && product.discount_price != null
      ? product.discount_price
      : product.base_price;
  return {
    price: effective,
    original: effective < product.base_price ? product.base_price : null,
  };
};

const pickFirstAvailableVariation = (
  product: Product
): ProductVariation | undefined => {
  if (!product.variations || product.variations.length === 0) return undefined;
  const available = product.variations.find((v) => v.stock_quantity > 0);
  return available || product.variations[0];
};

const RecommendationRail: React.FC<RecommendationRailProps> = ({
  products,
  title = 'You may also like',
  subtitle,
  variant = 'default',
  placement,
  onAddToCart,
  onProductClick,
}) => {
  const impressionFiredRef = useRef(false);

  useEffect(() => {
    if (products.length === 0 || impressionFiredRef.current) return;
    impressionFiredRef.current = true;
    posthog.capture('vrjonina_recommendation_impression', {
      placement,
      product_ids: products.map((p) => p.id),
      product_names: products.map((p) => p.name),
      count: products.length,
    });
  }, [products, placement]);

  if (products.length === 0) return null;

  const handleAdd = (product: Product) => {
    const variation = pickFirstAvailableVariation(product);
    posthog.capture('vrjonina_recommendation_add_to_cart', {
      placement,
      product_id: product.id,
      product_name: product.name,
    });
    onAddToCart(product, variation, 1, 'vial_only');
  };

  const handleClick = (product: Product) => {
    posthog.capture('vrjonina_recommendation_click', {
      placement,
      product_id: product.id,
      product_name: product.name,
    });
    onProductClick?.(product);
  };

  if (variant === 'compact') {
    return (
      <div className="bg-white rounded-2xl border border-brand-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <h3 className="font-heading font-bold text-charcoal-900 text-sm">
            {title}
          </h3>
        </div>
        <div className="space-y-2">
          {products.map((product) => {
            const { price, original } = getDisplayPrice(product);
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2 rounded-xl border border-brand-100 hover:border-brand-300 transition-colors"
              >
                <button
                  onClick={() => handleClick(product)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden border border-brand-100"
                    style={{ background: 'linear-gradient(135deg, #EAF4FA, #D6EAF5)' }}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-300">
                        <Heart className="w-5 h-5" fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-charcoal-900 text-xs truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-brand-700">
                        ₱{price.toLocaleString('en-PH')}
                      </span>
                      {original && (
                        <span className="text-[10px] text-charcoal-300 line-through">
                          ₱{original.toLocaleString('en-PH')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleAdd(product)}
                  className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors flex-shrink-0"
                  title={`Add ${product.name} to cart`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-100 p-4 md:p-6 shadow-soft">
      <div className="mb-4">
        <h3 className="font-heading text-base md:text-lg font-bold text-charcoal-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-500" />
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-charcoal-400 mt-1 font-cute">{subtitle}</p>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((product) => {
          const { price, original } = getDisplayPrice(product);
          return (
            <div
              key={product.id}
              className="flex flex-col rounded-xl border border-brand-100 hover:border-brand-300 hover:shadow-soft transition-all overflow-hidden bg-white"
            >
              <button
                onClick={() => handleClick(product)}
                className="text-left"
              >
                <div
                  className="aspect-square overflow-hidden border-b border-brand-100"
                  style={{ background: 'linear-gradient(135deg, #EAF4FA, #D6EAF5)' }}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-300">
                      <Heart className="w-8 h-8" fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="p-2 md:p-3">
                  <p className="font-bold text-charcoal-900 text-xs md:text-sm line-clamp-2 mb-1 min-h-[2.5em]">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm md:text-base font-bold text-brand-700">
                      ₱{price.toLocaleString('en-PH')}
                    </span>
                    {original && (
                      <span className="text-[10px] md:text-xs text-charcoal-300 line-through">
                        ₱{original.toLocaleString('en-PH')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleAdd(product)}
                className="mx-2 mb-2 md:mx-3 md:mb-3 mt-auto py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-brand-200"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendationRail;
