import { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

// Lazy load route components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const COA = lazy(() => import('./components/COA'));
const FAQ = lazy(() => import('./components/FAQ'));
const PeptideCalculator = lazy(() => import('./components/PeptideCalculator'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));
const ProtocolGuide = lazy(() => import('./components/ProtocolGuide'));
const UserProfile = lazy(() => import('./components/UserProfile'));

import { useMenu } from './hooks/useMenu';
import { useReferralCapture } from './hooks/useReferralCapture';
// import { useCOAPageSetting } from './hooks/useCOAPageSetting';

function MainApp() {
    const cart = useCart();
    const { menuItems, refreshProducts } = useMenu();
    const [currentView, setCurrentView] = useState<'menu' | 'checkout'>('menu');
    const [cartOpen, setCartOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
                            addToCart={cart.addToCart}
                            cartItems={cart.cartItems}
                            updateQuantity={cart.updateQuantity}
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
                            addToCart={cart.addToCart}
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
                    addToCart={cart.addToCart}
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


function App() {
    useReferralCapture();

    return (
        <Router>
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<MainApp />} />
                    <Route path="/coa" element={<COA />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/calculator" element={<PeptideCalculator />} />
                    <Route path="/track-order" element={<OrderTracking />} />
                    <Route path="/protocols" element={<ProtocolGuide />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/user/profile" element={<UserProfile />} />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default App;
