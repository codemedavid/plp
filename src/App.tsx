import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Seo from './components/seo/Seo';
import { organizationSchema, websiteSchema, productSchema, DEFAULT_TITLE, SITE_NAME } from './lib/seo';
import { findProductBySlug, slugify } from './lib/slug';
import { useIsAdmin } from './hooks/useIsAdmin';
import NotFound from './pages/NotFound';
import { useCart } from './hooks/useCart';
import Header from './components/Header';
import SubNav from './components/SubNav';
import Menu from './components/Menu';
import FloatingCartButton from './components/FloatingCartButton';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load non-critical and conditionally rendered components
const Cart = lazy(() => import('./components/Cart'));
const Checkout = lazy(() => import('./components/Checkout'));
const WelcomePopup = lazy(() => import('./components/WelcomePopup'));
const PromoBanner = lazy(() => import('./components/PromoBanner'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const ResetPasswordModal = lazy(() => import('./components/ResetPasswordModal'));

// Lazy load route components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const PeptideCalculator = lazy(() => import('./components/PeptideCalculator'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));
const ProtocolGuide = lazy(() => import('./components/ProtocolGuide'));
const ResearchBlog = lazy(() => import('./components/research/ResearchBlog'));
const ResearchArticle = lazy(() => import('./components/research/ResearchArticle'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const ShippingReturns = lazy(() => import('./components/ShippingReturns'));
const TermsConditions = lazy(() => import('./components/TermsConditions'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));

import { useMenu } from './hooks/useMenu';
import { useReferralCapture } from './hooks/useReferralCapture';
import { useAuth } from './hooks/useAuth';
import { useCartAbandonment } from './hooks/useCartAbandonment';
import type { Product, ProductVariation, KitType } from './types';

function MainApp() {
    const cart = useCart();
    const { menuItems, loading: menuLoading, error: menuError, refreshProducts } = useMenu();
    const { user } = useAuth();
    void refreshProducts;
    useCartAbandonment(cart.cartItems, user);
    const [currentView, setCurrentView] = useState<'menu' | 'checkout'>('menu');
    const [cartOpen, setCartOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const { slug: productSlug } = useParams<{ slug: string }>();
    const activeProduct = productSlug ? findProductBySlug(menuItems, productSlug) : undefined;

    useEffect(() => {
        const handler = () => setAuthOpen(true);
        window.addEventListener('open-auth', handler);
        return () => window.removeEventListener('open-auth', handler);
    }, []);

    // When the user clicks the Supabase email-confirmation link, they land here
    // with `?auth=signin&confirmed=1`. Open the sign-in modal so they can log in.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('auth') === 'signin') {
            setAuthOpen(true);
            params.delete('auth');
            params.delete('confirmed');
            const cleanQuery = params.toString();
            const newUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '') + window.location.hash;
            window.history.replaceState({}, '', newUrl);
        }
    }, []);

    // Sign-in required before adding to cart
    const gatedAddToCart = (product: Product, variation?: ProductVariation, quantity?: number, kitType?: KitType) => {
        if (!user) {
            setAuthOpen(true);
            return;
        }
        cart.addToCart(product, variation, quantity, kitType);
    };

    const handleViewChange = (view: 'menu' | 'checkout') => {
        setCurrentView(view);
        // Scroll to top when changing views
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCategoryClick = (categoryId: string) => {
        setSelectedCategory(categoryId);
    };

    // Filter products based on selected category
    const filteredProducts = selectedCategory === 'all'
        ? menuItems
        : menuItems.filter(item => item.category === selectedCategory);

    return (
        <div className="min-h-screen font-cute flex flex-col bg-white">
            {activeProduct ? (
                <Seo
                    title={`${activeProduct.name} — ${SITE_NAME}`}
                    description={activeProduct.description || undefined}
                    path={`/products/${slugify(activeProduct.name)}`}
                    image={activeProduct.image_url || undefined}
                    jsonLd={productSchema({
                        name: activeProduct.name,
                        slug: slugify(activeProduct.name),
                        description: activeProduct.description,
                        image: activeProduct.image_url,
                        price: activeProduct.base_price,
                        available: activeProduct.available,
                    })}
                />
            ) : (
                <Seo title={DEFAULT_TITLE} path="/" jsonLd={[organizationSchema(), websiteSchema()]} />
            )}
            <Suspense fallback={null}>
                <WelcomePopup />
            </Suspense>
            <Header
                cartItemsCount={cart.getTotalItems()}
                onCartClick={() => setCartOpen(true)}
                onMenuClick={() => handleViewChange('menu')}
                onAccountClick={() => setAuthOpen(true)}
            />
            <Suspense fallback={null}>
                <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
            </Suspense>
            <Suspense fallback={null}>
                <PromoBanner />
            </Suspense>

            {/* SubNav hidden in new design — categories accessible via Products nav */}
            {false && currentView === 'menu' && (
                <SubNav selectedCategory={selectedCategory} onCategoryClick={handleCategoryClick} />
            )}

            <main className="flex-grow">
                <Suspense fallback={<LoadingSpinner />}>
                    {currentView === 'menu' && (
                        <Menu
                            menuItems={filteredProducts}
                            addToCart={gatedAddToCart}
                            cartItems={cart.cartItems}
                            updateQuantity={cart.updateQuantity}
                            loading={menuLoading}
                            error={menuError}
                            onRetry={refreshProducts}
                        />
                    )}

                    {currentView === 'checkout' && (
                        <Checkout
                            cartItems={cart.cartItems}
                            totalPrice={cart.getTotalPrice()}
                            onBack={() => {
                                handleViewChange('menu');
                                setCartOpen(true);
                            }}
                            allProducts={menuItems}
                            addToCart={gatedAddToCart}
                        />
                    )}
                </Suspense>
            </main>

            <Suspense fallback={null}>
                <Cart
                    isOpen={cartOpen}
                    onClose={() => setCartOpen(false)}
                    cartItems={cart.cartItems}
                    updateQuantity={cart.updateQuantity}
                    removeFromCart={cart.removeFromCart}
                    clearCart={cart.clearCart}
                    getTotalPrice={cart.getTotalPrice}
                    onContinueShopping={() => setCartOpen(false)}
                    onCheckout={() => {
                        setCartOpen(false);
                        handleViewChange('checkout');
                    }}
                    allProducts={menuItems}
                    addToCart={gatedAddToCart}
                />
            </Suspense>

            {currentView === 'menu' && (
                <>
                    <FloatingCartButton
                        itemCount={cart.getTotalItems()}
                        onCartClick={() => setCartOpen(true)}
                    />
                    <Footer />
                </>
            )}
        </div>
    );
}


function AdminRoute({ children }: { children: React.ReactNode }) {
    const { isAdmin, loading } = useIsAdmin();
    if (loading) return <LoadingSpinner />;
    if (!isAdmin) return <Navigate to="/" replace />;
    return <>{children}</>;
}

function App() {
    useReferralCapture();

    return (
        <Router>
            <Suspense fallback={null}>
                <ResetPasswordModal />
            </Suspense>
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<MainApp />} />
                    <Route path="/products/:slug" element={<MainApp />} />
                    <Route path="/calculator" element={<PeptideCalculator />} />
                    <Route path="/track-order" element={<OrderTracking />} />
                    <Route path="/protocols" element={<ProtocolGuide />} />
                    <Route path="/research" element={<ResearchBlog />} />
                    <Route path="/research/:slug" element={<ResearchArticle />} />
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <AdminDashboard />
                            </AdminRoute>
                        }
                    />
                    <Route path="/user/profile" element={<UserProfile />} />
                    <Route path="/shipping-returns" element={<ShippingReturns />} />
                    <Route path="/terms" element={<TermsConditions />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default App;
