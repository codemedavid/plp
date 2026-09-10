import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Seo from '../components/seo/Seo';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OrderPlacedPanel from '../components/orders/OrderPlacedPanel';
import { parseOrderPlacedSummary } from '../lib/orderPlacedSummary';
import { useCart } from '../hooks/useCart';
import { SITE_NAME } from '../lib/seo';

/**
 * Landing page after a successful checkout. Checkout navigates here with the
 * order recap in router state; a direct visit or refresh loses that state, so
 * the panel falls back to generic guidance instead of an empty page.
 */
const OrderPlaced: React.FC = () => {
    const { state } = useLocation();
    const { cartItems } = useCart();
    const summary = parseOrderPlacedSummary(state);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, []);

    return (
        <div className="min-h-screen font-cute flex flex-col bg-white">
            <Seo
                title={`Order Placed — ${SITE_NAME}`}
                description="Your order has been placed. Confirmation and status updates are sent to your email."
                path="/order-placed"
                noindex
            />
            <Header
                cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                onCartClick={() => { }}
                onMenuClick={() => { window.location.href = '/'; }}
            />
            <div className="flex-grow">
                <OrderPlacedPanel summary={summary} />
            </div>
            <Footer />
        </div>
    );
};

export default OrderPlaced;
