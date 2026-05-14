import React, { useEffect, useState } from 'react';
import {
  X,
  Heart,
  ShoppingCart,
  Plus,
  Minus,
  FileText,
  Gift,
  Package,
  Sparkles,
} from 'lucide-react';
import type { Product, ProductVariation, KitType, BundleTier } from '../types';
import { KIT_UPGRADE_PRICE } from '../types';
import { useRecommendations } from '../hooks/useRecommendations';
import RecommendationRail from './RecommendationRail';
import ProductReviews from './ProductReviews';
import { getMatchingBundleTier } from '../lib/bundlePricing';
import { cleanText } from '../lib/cleanText';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, variation: ProductVariation | undefined, quantity: number, kitType?: KitType) => void;
  allProducts?: Product[];
  onProductSelect?: (product: Product) => void;
}

const DEFAULT_BUNDLE_TIERS: BundleTier[] = [
  { qty: 1, label: '1 BOTTLE' },
  { qty: 2, label: '2 BOTTLES', popular: true },
  { qty: 3, label: '3 BOTTLES' },
];

const sanitizeBundleTiers = (tiers: BundleTier[] | undefined): BundleTier[] => {
  if (!tiers || tiers.length === 0) return DEFAULT_BUNDLE_TIERS;
  const cleaned = tiers
    .filter((t) => Number.isFinite(t.qty) && t.qty > 0 && typeof t.label === 'string' && t.label.trim().length > 0)
    .map((t) => ({
      qty: Math.floor(t.qty),
      label: t.label,
      popular: Boolean(t.popular),
      price: typeof t.price === 'number' && Number.isFinite(t.price) && t.price > 0 ? t.price : null,
    }));
  return cleaned.length > 0 ? cleaned : DEFAULT_BUNDLE_TIERS;
};

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddToCart, allProducts = [], onProductSelect }) => {
  const recommendations = useRecommendations({
    products: allProducts,
    anchorProduct: product,
    limit: 4,
  });

  const getFirstAvailableVariation = () => {
    if (!product.variations || product.variations.length === 0) return undefined;
    const available = product.variations.find(v => v.stock_quantity > 0);
    return available || product.variations[0];
  };

  const [imageError, setImageError] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | undefined>(
    getFirstAvailableVariation()
  );
  const [quantity, setQuantity] = useState(1);
  const [kitType, setKitType] = useState<KitType>('vial_only');

  // Lock body scroll while sheet is open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const isSetProduct = product.inclusions && product.inclusions.length > 0;
  const isKitVariation = selectedVariation?.name?.toLowerCase().includes('kit');
  const showKitToggle = isSetProduct && !isKitVariation;

  const baseOriginal = selectedVariation ? selectedVariation.price : product.base_price;
  const baseDiscounted: number | null = selectedVariation
    ? (selectedVariation.discount_active && selectedVariation.discount_price != null
        ? selectedVariation.discount_price
        : null)
    : (product.discount_active && product.discount_price != null
        ? product.discount_price
        : null);
  const hasDiscount = baseDiscounted != null && baseDiscounted < baseOriginal;
  const discountPercent = hasDiscount
    ? Math.round((1 - (baseDiscounted! / baseOriginal)) * 100)
    : 0;

  const calculateUnitPrice = () => {
    const base = baseDiscounted ?? baseOriginal;
    const kitUpgrade = (kitType === 'complete_kit' && !isKitVariation) ? KIT_UPGRADE_PRICE : 0;
    return base + kitUpgrade;
  };

  const unitPrice = calculateUnitPrice();
  const matchedTier = getMatchingBundleTier(product, quantity);
  const kitUpgradeForQty =
    kitType === 'complete_kit' && !isKitVariation ? KIT_UPGRADE_PRICE * quantity : 0;
  const totalPrice = matchedTier
    ? matchedTier.price! + kitUpgradeForQty
    : unitPrice * quantity;
  const totalOriginal = unitPrice * quantity;
  const showBundleSavings = Boolean(matchedTier) && totalPrice < totalOriginal;
  const bundleSavingsPct = showBundleSavings
    ? Math.round((1 - totalPrice / totalOriginal) * 100)
    : 0;

  const hasAnyStock = product.variations && product.variations.length > 0
    ? product.variations.some(v => v.stock_quantity > 0)
    : product.stock_quantity > 0;

  const isOutOfStock =
    !product.available ||
    !hasAnyStock ||
    (selectedVariation ? selectedVariation.stock_quantity === 0 : product.stock_quantity === 0);

  const tagPool = [product.cas_number, product.sequence, product.molecular_weight]
    .filter((v): v is string => Boolean(v && v.trim()));
  const tags = tagPool.slice(0, 2);

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  const handleAddToCart = () => {
    const effectiveKitType = isKitVariation ? 'vial_only' : kitType;
    onAddToCart(product, selectedVariation, quantity, effectiveKitType);
    onClose();
  };

  const formatPrice = (n: number) =>
    `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  const variations = product.variations ?? [];
  const bundleTiers = sanitizeBundleTiers(product.bundle_tiers);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-charcoal-900/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl bg-white shadow-luxury rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 sm:pt-3 pb-1 flex-shrink-0">
          <span className="block w-10 h-1.5 rounded-full bg-charcoal-200" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-4 sm:px-5 pt-2 pb-4 flex-1">
          {/* Hero image card */}
          <div className="rounded-2xl bg-charcoal-50 border border-charcoal-100 p-6 sm:p-8 flex items-center justify-center aspect-[4/3] sm:aspect-[16/10]">
            {product.image_url && !imageError ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <Heart className="w-16 h-16 text-brand-200" fill="currentColor" />
            )}
          </div>

          {/* Product info card */}
          <div className="mt-4 rounded-2xl bg-white border border-charcoal-100 p-4 sm:p-5">
            {product.category && (
              <p className="font-serif italic text-charcoal-500 text-sm mb-1">
                {cleanText(product.category)}
              </p>
            )}
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-charcoal-900 tracking-tight">
                {cleanText(product.name)}
              </h2>
              <div className="flex items-baseline gap-2 flex-shrink-0">
                {hasDiscount && (
                  <span className="text-sm text-charcoal-300 line-through">
                    {formatPrice(baseOriginal)}
                  </span>
                )}
                <span className="text-2xl sm:text-3xl font-bold text-charcoal-900">
                  {formatPrice(baseDiscounted ?? baseOriginal)}
                </span>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full border border-charcoal-200 text-charcoal-700 text-xs sm:text-sm max-w-full truncate"
                    title={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p
              className="text-sm sm:text-base text-charcoal-500 leading-relaxed"
              style={{
                fontFamily: product.description_font_family || undefined,
                fontSize: product.description_font_size || undefined,
              }}
            >
              {cleanText(product.description)}
            </p>

            {isSetProduct && (
              <div className="mt-4">
                <p className="text-xs font-bold tracking-widest text-charcoal-500 mb-2">KIT INCLUSIONS</p>
                <ul
                  className="list-disc list-inside text-sm text-charcoal-700 space-y-1"
                  style={{
                    fontFamily: product.inclusions_font_family || undefined,
                    fontSize: product.inclusions_font_size || undefined,
                  }}
                >
                  {product.inclusions!.map((item, idx) => (
                    <li key={idx}>{cleanText(item)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Dosage */}
          {variations.length > 0 && (
            <div className="mt-5 flex items-center gap-4">
              <span className="font-bold text-charcoal-900 text-base w-24 flex-shrink-0">Dosage</span>
              <div className="flex flex-wrap gap-2">
                {variations.map((variation) => {
                  const outOfStock = variation.stock_quantity === 0;
                  const isSelected = selectedVariation?.id === variation.id;
                  return (
                    <button
                      key={variation.id}
                      onClick={() => !outOfStock && setSelectedVariation(variation)}
                      disabled={outOfStock}
                      className={`px-5 py-2 rounded-xl border text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-charcoal-900 text-white border-charcoal-900'
                          : 'bg-white text-charcoal-900 border-charcoal-200 hover:border-charcoal-400'
                      } ${outOfStock ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                    >
                      {variation.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity + price */}
          <div className="mt-5 flex items-center gap-4">
            <span className="font-bold text-charcoal-900 text-base w-24 flex-shrink-0">Quantity</span>
            <div className="flex items-center justify-between flex-1 min-w-0">
              <div className="inline-flex items-center rounded-full border border-charcoal-200 bg-white">
                <button
                  onClick={decrementQuantity}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 flex items-center justify-center text-charcoal-700 hover:bg-charcoal-50 rounded-l-full transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[2rem] text-center font-bold text-charcoal-900">{quantity}</span>
                <button
                  onClick={incrementQuantity}
                  aria-label="Increase quantity"
                  className="w-10 h-10 flex items-center justify-center text-charcoal-700 hover:bg-charcoal-50 rounded-r-full transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-right">
                {(hasDiscount || showBundleSavings) && (
                  <div className="text-xs text-charcoal-300 line-through">
                    {formatPrice(showBundleSavings ? totalOriginal : baseOriginal * quantity)}
                  </div>
                )}
                <div className="text-2xl sm:text-3xl font-bold text-charcoal-900">
                  {formatPrice(totalPrice)}
                </div>
                {showBundleSavings ? (
                  <div className="text-[10px] font-bold text-emerald-600">SAVE {bundleSavingsPct}%</div>
                ) : hasDiscount ? (
                  <div className="text-[10px] font-bold text-brand-600">{discountPercent}% OFF</div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Kit toggle (only for set products with non-kit variation) */}
          {showKitToggle && (
            <div className="mt-5">
              <span className="font-bold text-charcoal-900 text-xs uppercase tracking-wide">
                Kit Option
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setKitType('vial_only')}
                  className={`p-3 rounded-2xl border text-sm text-left transition-all ${
                    kitType === 'vial_only'
                      ? 'border-charcoal-900 bg-charcoal-50 ring-1 ring-charcoal-900'
                      : 'border-charcoal-200 hover:border-charcoal-400'
                  }`}
                >
                  <Package className="w-4 h-4 mb-1 text-charcoal-700" />
                  <div className="font-bold text-charcoal-900">Vial Only</div>
                  <div className="text-xs text-charcoal-400">Peptide vial</div>
                </button>
                <button
                  onClick={() => setKitType('complete_kit')}
                  className={`p-3 rounded-2xl border text-sm text-left transition-all relative ${
                    kitType === 'complete_kit'
                      ? 'border-charcoal-900 bg-charcoal-50 ring-1 ring-charcoal-900'
                      : 'border-charcoal-200 hover:border-charcoal-400'
                  }`}
                >
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full bg-brand-500">
                    +₱{KIT_UPGRADE_PRICE}
                  </span>
                  <Gift className="w-4 h-4 mb-1 text-charcoal-700" />
                  <div className="font-bold text-charcoal-900">Complete Kit</div>
                  <div className="text-xs text-charcoal-400">All accessories</div>
                </button>
              </div>
            </div>
          )}

          {/* Bundle & Save */}
          <div className="mt-6">
            <p className="text-xs font-bold tracking-widest text-charcoal-500 mb-3">BUNDLE &amp; SAVE</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-5 px-4 sm:px-5 pt-3 pb-2 snap-x snap-mandatory">
              {bundleTiers.map((tier) => {
                const isSelected = quantity === tier.qty;
                const fullTotal = unitPrice * tier.qty;
                const hasTierPrice =
                  typeof tier.price === 'number' && tier.price > 0 && tier.price < fullTotal;
                const tierTotal = hasTierPrice ? tier.price! : fullTotal;
                const tierSavingsPct = hasTierPrice
                  ? Math.round((1 - tier.price! / fullTotal) * 100)
                  : 0;
                return (
                  <button
                    key={tier.qty}
                    onClick={() => setQuantity(tier.qty)}
                    className={`relative flex-shrink-0 snap-start w-44 sm:w-48 rounded-2xl border-2 p-3 text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/40 shadow-soft'
                        : tier.popular
                          ? 'border-brand-200 hover:border-brand-400 bg-white'
                          : 'border-charcoal-100 hover:border-charcoal-300 bg-white'
                    }`}
                  >
                    {tier.popular && (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[10px] font-extrabold tracking-[0.08em] uppercase whitespace-nowrap shadow-glow"
                        style={{ background: 'linear-gradient(135deg, #D4A554, #5FA8C8)' }}
                      >
                        <Sparkles className="w-3 h-3" fill="currentColor" />
                        Most Popular
                      </span>
                    )}
                    {hasTierPrice && (
                      <span className="absolute top-2 right-2 text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded-full bg-emerald-500">
                        SAVE {tierSavingsPct}%
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-14 flex-shrink-0">
                        {Array.from({ length: Math.min(tier.qty, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className="-ml-2 first:ml-0 w-9 h-14 rounded-md bg-charcoal-50 border border-charcoal-100 overflow-hidden flex items-center justify-center"
                          >
                            {product.image_url && !imageError ? (
                              <img
                                src={product.image_url}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Heart className="w-4 h-4 text-brand-200" fill="currentColor" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-charcoal-900 text-sm">{tier.label}</p>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-charcoal-900">{formatPrice(tierTotal)}</p>
                          {hasTierPrice && (
                            <p className="text-[10px] text-charcoal-300 line-through">
                              {formatPrice(fullTotal)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CoA + Add to cart */}
          <div className="mt-5 flex items-center gap-3">
            {product.safety_sheet_url ? (
              <a
                href={product.safety_sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-full border border-charcoal-200 text-charcoal-900 text-sm font-bold hover:bg-charcoal-50 transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
              >
                <FileText className="w-4 h-4" />
                CoA
              </a>
            ) : (
              <button
                disabled
                className="px-5 py-3 rounded-full border border-charcoal-200 text-charcoal-400 text-sm font-bold cursor-not-allowed inline-flex items-center gap-1.5 flex-shrink-0"
              >
                <FileText className="w-4 h-4" />
                CoA
              </button>
            )}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="group relative flex-1 py-3.5 bg-navy-900 text-white text-[11px] font-semibold tracking-[0.28em] uppercase border border-gold-500/40 hover:bg-gold-600 hover:border-gold-600 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
              style={{ borderRadius: '2px' }}
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-60" />
              <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-40" />
              {!isOutOfStock && <ShoppingCart className="w-4 h-4 text-gold-500 group-hover:text-white transition-colors" strokeWidth={1.5} />}
              <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
            </button>
          </div>

          {/* Payment methods */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-charcoal-500">We accept</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md border border-charcoal-200 text-charcoal-700 text-[10px] font-bold">Maya</span>
            </div>
          </div>

          {/* Customer Reviews */}
          <ProductReviews productId={product.id} />

          {/* Pairs Well With */}
          {recommendations.length > 0 && (
            <div className="mt-6">
              <RecommendationRail
                products={recommendations}
                title="Pairs well with"
                subtitle="Customers who picked this often add these"
                placement="pdp"
                onAddToCart={onAddToCart}
                onProductClick={onProductSelect}
              />
            </div>
          )}
        </div>

        {/* Sticky compact action bar */}
        <div className="border-t border-charcoal-100 bg-white px-4 sm:px-5 py-3 flex-shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-charcoal-700 truncate pr-2">{cleanText(product.name)}</span>
            <span className="text-base font-bold text-charcoal-900 flex-shrink-0">
              {formatPrice(unitPrice)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {variations.length > 0 ? (
              <div className="flex items-center gap-2 flex-shrink min-w-0 overflow-x-auto scrollbar-hide">
                {variations.map((variation) => {
                  const outOfStock = variation.stock_quantity === 0;
                  const isSelected = selectedVariation?.id === variation.id;
                  return (
                    <button
                      key={variation.id}
                      onClick={() => !outOfStock && setSelectedVariation(variation)}
                      disabled={outOfStock}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all flex-shrink-0 ${
                        isSelected
                          ? 'bg-charcoal-900 text-white border-charcoal-900'
                          : 'bg-white text-charcoal-900 border-charcoal-200'
                      } ${outOfStock ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                    >
                      {variation.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-1 ml-auto py-2.5 rounded-full bg-charcoal-900 text-white text-sm font-bold hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[7rem]"
            >
              {isOutOfStock ? 'Unavailable' : 'Add'}
              {!isOutOfStock && <ShoppingCart className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
