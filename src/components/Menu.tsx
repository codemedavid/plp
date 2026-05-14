import React, { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MenuItemCard from './MenuItemCard';
import Hero from './Hero';
import ProductDetailModal from './ProductDetailModal';
import type { Product, ProductVariation, CartItem, KitType } from '../types';
import { slugify, findProductBySlug } from '../lib/slug';
import {
  ArrowRight, User as UserIcon, Dumbbell, Activity,
  MessageCircle
} from 'lucide-react';

interface MenuProps {
  menuItems: Product[];
  addToCart: (product: Product, variation?: ProductVariation, quantity?: number, kitType?: KitType) => void;
  cartItems: CartItem[];
  updateQuantity: (index: number, quantity: number) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const Menu: React.FC<MenuProps> = ({ menuItems, addToCart, cartItems, loading, error, onRetry }) => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const selectedProduct = slug ? findProductBySlug(menuItems, slug) ?? null : null;
  const openProduct = (product: Product) => navigate(`/products/${slugify(product.name)}`);
  const closeProduct = () => navigate('/');
  const productsRef = useRef<HTMLDivElement | null>(null);

  const sortedProducts = [...menuItems].sort((a, b) => {
    if (a.name === 'Tirzepatide') return -1;
    if (b.name === 'Tirzepatide') return 1;
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  const featuredProducts = sortedProducts.slice(0, 4);

  const getCartQuantity = (productId: string) =>
    cartItems
      .filter(item => item.product.id === productId && !item.variation)
      .reduce((sum, item) => sum + item.quantity, 0);

  const protocols = [
    { icon: UserIcon, title: 'Weight Management', desc: 'Support metabolism, reduce fat, and optimize energy.' },
    { icon: Dumbbell, title: 'Muscle & Recovery', desc: 'Enhance strength, speed recovery, and performance.' },
    { icon: Activity, title: 'Longevity & Vitality', desc: 'Promote healthy aging, hormone balance, and overall vitality.' },
  ];

  return (
    <>
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={closeProduct}
          onAddToCart={(product, variation, quantity, kitType) => {
            addToCart(product, variation, quantity, kitType);
          }}
          allProducts={menuItems}
          onProductSelect={openProduct}
        />
      )}

      <div className="bg-white">
        <Hero
          onShopAll={() => {
            productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />

        {/* ── Premium Peptide Solutions ── */}
        <section ref={productsRef} className="bg-cream-light py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.32em] uppercase text-gold-600 mb-3">
                  Shop Our Products
                </p>
                <h2 className="font-heading text-4xl md:text-5xl font-normal text-navy-900 tracking-tight">
                  Premium peptide solutions
                </h2>
              </div>
              <button
                onClick={() => {
                  document.getElementById('all-products')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.28em] uppercase text-navy-900 hover:text-gold-600 transition-colors"
              >
                View All Products
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product) => (
                <MenuItemCard
                  key={product.id}
                  product={product}
                  cartQuantity={getCartQuantity(product.id)}
                  onProductClick={openProduct}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Personalized Protocols (Navy Section) ── */}
        <section className="relative bg-navy-900 py-20 md:py-24 overflow-hidden">
          {/* Subtle gold corner decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <svg viewBox="0 0 100 100" fill="none">
              <circle cx="80" cy="20" r="30" stroke="#C9A876" strokeWidth="0.5" />
              <circle cx="80" cy="20" r="20" stroke="#C9A876" strokeWidth="0.5" />
            </svg>
          </div>

          <div className="container mx-auto px-4 md:px-8 relative">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-12">
              {/* Left intro */}
              <div className="lg:col-span-4">
                <p className="text-[11px] font-semibold tracking-[0.32em] uppercase text-gold-500 mb-4">
                  Personalized Protocols
                </p>
                <h2 className="font-heading text-3xl md:text-4xl font-normal text-white tracking-tight mb-5 leading-tight">
                  Personalized.<br />Purposeful. Proven.
                </h2>
                <p className="text-navy-200 text-sm leading-relaxed mb-8 max-w-sm">
                  Our protocols are thoughtfully designed to help you achieve your wellness goals with precision and care.
                </p>
                <a
                  href="/protocols"
                  className="group inline-flex items-center justify-between gap-6 px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-white text-[11px] font-semibold tracking-[0.22em] uppercase transition-colors"
                  style={{ borderRadius: '2px' }}
                >
                  Explore Protocols
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
                </a>
              </div>

              {/* Protocol cards */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {protocols.map((p, i) => (
                  <div key={i} className="bg-navy-700/40 border border-navy-700 p-6 hover:bg-navy-700/60 transition-colors" style={{ borderRadius: '2px' }}>
                    <div className="text-gold-500 mb-5">
                      <p.icon className="w-8 h-8" strokeWidth={1.2} />
                    </div>
                    <h3 className="font-heading text-lg text-white mb-2 tracking-tight">{p.title}</h3>
                    <p className="text-navy-200 text-xs leading-relaxed mb-6 font-light">{p.desc}</p>
                    <a
                      href="/protocols"
                      className="group inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.28em] uppercase text-gold-500 hover:text-gold-400 transition-colors"
                    >
                      View Protocol
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust Badges Row ── */}

        {/* ── Join the Inner Circle (Messenger Group) ── */}
        <section className="bg-white py-12">
          <div className="container mx-auto px-4 md:px-8">
            <div className="border border-gold-300 bg-cream-light p-6 md:p-8" style={{ borderRadius: '2px' }}>
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-gold-500 flex items-center justify-center text-gold-600 shrink-0">
                    <MessageCircle className="w-6 h-6" strokeWidth={1.4} />
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl text-navy-900 mb-1 tracking-tight">Join the Inner Circle</h3>
                    <p className="text-xs text-charcoal-500 leading-relaxed font-light">
                      Be the first to access new products, exclusive offers, and expert wellness insights.
                    </p>
                  </div>
                </div>
                <div className="flex md:justify-end">
                  <a
                    href="https://m.me/j/AbajrxmIUNpzttP_/?send_source=gc:copy_invite_link_c"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center justify-between gap-6 px-7 py-3.5 bg-navy-900 hover:bg-navy-700 text-white text-[11px] font-semibold tracking-[0.22em] uppercase transition-colors"
                    style={{ borderRadius: '2px' }}
                  >
                    Join Messenger Group
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── All Products Grid (full catalog) ── */}
        <section id="all-products" className="bg-cream-light py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center mb-12">
              <p className="text-[11px] font-semibold tracking-[0.32em] uppercase text-gold-600 mb-3">
                Full Catalog
              </p>
              <h2 className="font-heading text-4xl md:text-5xl font-normal text-navy-900 tracking-tight">
                All products
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-charcoal-100 overflow-hidden animate-pulse"
                  >
                    <div className="aspect-square bg-charcoal-100" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-charcoal-100 rounded w-3/4" />
                      <div className="h-3 bg-charcoal-100 rounded w-1/2" />
                      <div className="h-9 bg-charcoal-100 rounded-full mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20 space-y-4">
                <p className="text-red-600">Failed to load products: {error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-6 py-3 bg-navy-900 hover:bg-gold-600 text-white text-[11px] font-semibold tracking-[0.22em] uppercase transition-colors rounded"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-charcoal-500">No products available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {sortedProducts.map((product) => (
                  <MenuItemCard
                    key={product.id}
                    product={product}
                    cartQuantity={getCartQuantity(product.id)}
                    onProductClick={openProduct}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default Menu;
