import React, { useEffect, useState } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, ArrowRight, ExternalLink, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from './Header';
import Footer from './Footer';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

interface TrackingOrder {
    id: string;
    order_number: string | null;
    order_status: string;
    payment_status: string;
    tracking_number: string | null;
    shipping_provider: string | null;
    shipping_note: string | null;
    total_price: number;
    shipping_fee: number;
    order_items: {
        product_name: string;
        quantity: number;
    }[];
    created_at: string;
    promo_code: string | null;
    discount_applied: number | null;
}

const STEPS = ['Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

const OrderTracking: React.FC = () => {
    const { cartItems } = useCart();
    const { user } = useAuth();
    const [orderId, setOrderId] = useState('');
    const [order, setOrder] = useState<TrackingOrder | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [myOrders, setMyOrders] = useState<TrackingOrder[]>([]);
    const [myOrdersLoading, setMyOrdersLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            setMyOrders([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setMyOrdersLoading(true);
            const { data, error } = await supabase
                .from('orders')
                .select('id, order_number, order_status, payment_status, tracking_number, shipping_provider, shipping_note, total_price, shipping_fee, order_items, created_at, promo_code, discount_applied')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (cancelled) return;
            if (error) {
                console.error('Error fetching user orders:', error);
                setMyOrders([]);
            } else {
                setMyOrders((data ?? []) as TrackingOrder[]);
            }
            setMyOrdersLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [user]);

    const selectMyOrder = (o: TrackingOrder) => {
        setOrder(o);
        setHasSearched(true);
        setError(null);
        setOrderId(o.order_number || o.id.slice(0, 8).toUpperCase());
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return iso;
        }
    };

    const statusBadgeClass = (status: string) => {
        switch (status) {
            case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'shipped': return 'bg-navy-900 text-white border-navy-900';
            case 'processing': return 'bg-gold-500 text-white border-gold-500';
            case 'confirmed': return 'bg-gold-100 text-gold-700 border-gold-300';
            default: return 'bg-cream-light text-charcoal-600 border-gold-200';
        }
    };

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderId.trim()) return;

        setLoading(true);
        setError(null);
        setOrder(null);
        setHasSearched(true);

        try {
            const { data, error } = await supabase.rpc('get_order_details', {
                order_id_input: orderId.trim(),
            });

            if (error) throw error;

            if (data && Array.isArray(data) && data.length > 0) {
                setOrder(data[0] as TrackingOrder);
            } else {
                setError('Order not found. Please check your order number and try again.');
            }
        } catch (err) {
            console.error('Error fetching order:', err);
            setError('An error occurred while fetching your order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status: string) => {
        const steps = ['new', 'confirmed', 'processing', 'shipped', 'delivered'];
        if (status === 'cancelled') return -1;
        return steps.indexOf(status);
    };

    const currentStep = order ? getStatusStep(order.order_status) : 0;

    const providerLabel = (p: string | null) => {
        switch (p) {
            case 'lbc': return 'LBC Express';
            case 'lalamove': return 'Lalamove';
            case 'jnt': return 'J&T Express';
            case 'spx': return 'SPX Express';
            default: return 'J&T Express';
        }
    };

    const providerLink = (order: TrackingOrder) => {
        if (order.shipping_provider === 'lbc') return `https://www.lbcexpress.com/track/?tracking_no=${order.tracking_number}`;
        if (order.shipping_provider === 'lalamove') return 'https://web.lalamove.com/';
        if (order.shipping_provider === 'spx') return 'https://spx.ph/track';
        return `https://www.jtexpress.ph/trajectoryQuery?bills=${order.tracking_number}`;
    };

    return (
        <div className="min-h-screen bg-cream-light">
            <Header
                cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                onCartClick={() => { }}
                onMenuClick={() => { window.location.href = '/'; }}
            />

            {/* Hero band */}
            <section className="relative overflow-hidden bg-cream-light border-b border-gold-200">
                <div className="container mx-auto px-4 md:px-8 py-16 md:py-20 max-w-4xl">
                    <a
                        href="/"
                        className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-charcoal-500 hover:text-navy-900 transition-colors mb-10"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" strokeWidth={1.8} />
                        Back to Home
                    </a>

                    <div className="max-w-2xl">
                        <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-5">Order Status</span>
                        <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-normal leading-[0.95] text-navy-900 tracking-tight mb-6">
                            Track Your<br />Order
                        </h1>
                        <div className="w-12 h-px bg-gold-500 mb-6" />
                        <p className="text-base md:text-lg text-charcoal-500 font-light leading-relaxed max-w-md">
                            Enter your order number to check the current status of your shipment.
                        </p>
                    </div>
                </div>
            </section>

            <main className="container mx-auto px-4 md:px-8 py-12 max-w-4xl">
                {/* Search */}
                <form onSubmit={handleTrack} className="bg-white border border-gold-200 p-6 md:p-8 mb-8">
                    <label className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-3">Order Number</label>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 w-4 h-4" strokeWidth={1.8} />
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="e.g. PLP-1234"
                                className="w-full pl-11 pr-4 py-4 border border-gold-200 bg-cream-light/60 focus:bg-white focus:border-gold-500 outline-none transition-all text-navy-900 font-mono tracking-wider placeholder:text-charcoal-400 placeholder:font-sans"
                                style={{ borderRadius: '2px' }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !orderId.trim()}
                            className="group inline-flex items-center justify-between gap-6 px-7 py-4 bg-navy-900 text-white text-xs font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ borderRadius: '2px' }}
                        >
                            {loading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                                    Searching
                                </>
                            ) : (
                                <>
                                    Track Order
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Your Orders (logged-in users) */}
                {user && (
                    <section className="bg-white border border-gold-200 p-6 md:p-8 mb-8">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-1">Your Account</p>
                                <h2 className="font-heading text-2xl text-navy-900">Your Orders</h2>
                            </div>
                            {myOrdersLoading && (
                                <div className="w-4 h-4 border border-gold-500 border-t-transparent rounded-full animate-spin" />
                            )}
                        </div>

                        {!myOrdersLoading && myOrders.length === 0 && (
                            <p className="text-sm text-charcoal-500 font-light">You haven't placed any orders yet.</p>
                        )}

                        {myOrders.length > 0 && (
                            <ul className="divide-y divide-gold-100">
                                {myOrders.map((o) => {
                                    const isActive = order?.id === o.id;
                                    return (
                                        <li key={o.id}>
                                            <button
                                                type="button"
                                                onClick={() => selectMyOrder(o)}
                                                className={`w-full text-left py-4 px-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-cream-light/60 transition-colors ${isActive ? 'bg-cream-light/80' : ''}`}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-mono text-sm tracking-wider text-navy-900">
                                                        {o.order_number || o.id.slice(0, 8).toUpperCase()}
                                                    </span>
                                                    <span className="text-[11px] uppercase tracking-[0.22em] text-charcoal-400">
                                                        {formatDate(o.created_at)} · {o.order_items?.length ?? 0} item{(o.order_items?.length ?? 0) === 1 ? '' : 's'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-sm text-navy-900">
                                                        ₱{(o.total_price + (o.shipping_fee || 0)).toLocaleString()}
                                                    </span>
                                                    <span className={`text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 border capitalize ${statusBadgeClass(o.order_status)}`}>
                                                        {o.order_status}
                                                    </span>
                                                    <ArrowRight className="w-4 h-4 text-charcoal-400" strokeWidth={1.8} />
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                )}

                {/* Error */}
                {error && (
                    <div className="border border-rose-300 bg-rose-50/60 p-5 flex items-center gap-3 mb-8">
                        <AlertCircle className="w-5 h-5 text-rose-700 flex-shrink-0" strokeWidth={1.8} />
                        <p className="text-sm text-rose-800 font-light">{error}</p>
                    </div>
                )}

                {/* Result */}
                {hasSearched && order && (
                    <div className="space-y-px bg-gold-200">
                        {/* Status header (navy) */}
                        <div className="bg-navy-900 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-400 mb-2">Current Status</p>
                                <h2 className="font-heading text-3xl md:text-4xl capitalize flex items-center gap-3">
                                    {order.order_status === 'new' && <Clock className="w-7 h-7 text-gold-400" strokeWidth={1.5} />}
                                    {order.order_status === 'confirmed' && <CheckCircle className="w-7 h-7 text-gold-400" strokeWidth={1.5} />}
                                    {order.order_status === 'processing' && <Package className="w-7 h-7 text-gold-400" strokeWidth={1.5} />}
                                    {order.order_status === 'shipped' && <Truck className="w-7 h-7 text-gold-400" strokeWidth={1.5} />}
                                    {order.order_status === 'delivered' && <CheckCircle className="w-7 h-7 text-emerald-400" strokeWidth={1.5} />}
                                    {order.order_status === 'cancelled' && <AlertCircle className="w-7 h-7 text-rose-400" strokeWidth={1.5} />}
                                    {order.order_status}
                                </h2>
                            </div>
                            <div className="text-left md:text-right border-t border-navy-700 md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0">
                                <p className="text-[10px] uppercase tracking-[0.32em] text-gold-400 mb-2">Order Number</p>
                                <p className="font-mono text-xl tracking-wider">{order.order_number || order.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="bg-white p-6 md:p-8">
                            {order.order_status !== 'cancelled' ? (
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-6">Fulfillment Progress</p>
                                    <div className="relative">
                                        <div className="absolute top-4 left-0 w-full h-px bg-gold-200" />
                                        <div
                                            className="absolute top-4 left-0 h-px bg-gold-500 transition-all duration-500"
                                            style={{ width: `${Math.min(100, Math.max(0, currentStep * 25))}%` }}
                                        />
                                        <div className="relative flex justify-between">
                                            {STEPS.map((step, index) => {
                                                const isCompleted = index <= currentStep;
                                                const isCurrent = index === currentStep;
                                                return (
                                                    <div key={step} className="flex flex-col items-center gap-3">
                                                        <div
                                                            className={`w-8 h-8 flex items-center justify-center border transition-all ${isCompleted
                                                                ? 'border-gold-500 bg-gold-500 text-white'
                                                                : 'border-gold-200 bg-white text-charcoal-300'
                                                                } ${isCurrent ? 'ring-2 ring-gold-200 ring-offset-2 ring-offset-white' : ''}`}
                                                        >
                                                            {isCompleted ? (
                                                                <CheckCircle className="w-4 h-4" strokeWidth={1.8} />
                                                            ) : (
                                                                <div className="w-1.5 h-1.5 bg-charcoal-300" />
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] uppercase tracking-[0.22em] font-medium ${isCompleted ? 'text-navy-900' : 'text-charcoal-400'}`}>
                                                            {step}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-rose-300 bg-rose-50/60 p-5 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-rose-700 mt-0.5 flex-shrink-0" strokeWidth={1.8} />
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.32em] text-rose-700 font-semibold mb-1">Order Cancelled</p>
                                        <p className="text-sm text-rose-800 font-light">This order has been cancelled. Please contact support if you believe this is a mistake.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tracking + summary grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gold-200">
                            {/* Tracking info */}
                            <div className="bg-white p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 border border-gold-300 flex items-center justify-center text-gold-600">
                                        <Truck className="w-4 h-4" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="font-heading text-xl text-navy-900">Tracking</h3>
                                </div>

                                {order.tracking_number ? (
                                    <div className="space-y-5">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-2">
                                                Tracking Number · {providerLabel(order.shipping_provider)}
                                            </p>
                                            <p className="text-lg font-mono tracking-wider text-navy-900">{order.tracking_number}</p>
                                        </div>

                                        <a
                                            href={providerLink(order)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group inline-flex w-full items-center justify-between gap-4 px-5 py-3 border border-gold-500 text-navy-900 text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-gold-500 hover:text-white transition-all"
                                            style={{ borderRadius: '2px' }}
                                        >
                                            Open {providerLabel(order.shipping_provider)}
                                            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border border-dashed border-gold-200">
                                        <Truck className="w-8 h-8 mx-auto mb-3 text-gold-300" strokeWidth={1.2} />
                                        <p className="text-sm text-charcoal-500 font-light">No tracking number yet.</p>
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal-400 mt-2">Check back when shipped</p>
                                    </div>
                                )}

                                {order.shipping_note && (
                                    <div className="mt-6 border-l-2 border-gold-500 pl-5">
                                        <p className="text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-2">Shipping Update</p>
                                        <p className="text-sm text-charcoal-700 font-light leading-relaxed">{order.shipping_note}</p>
                                    </div>
                                )}
                            </div>

                            {/* Order summary */}
                            <div className="bg-white p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 border border-gold-300 flex items-center justify-center text-gold-600">
                                        <Package className="w-4 h-4" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="font-heading text-xl text-navy-900">Order Summary</h3>
                                </div>

                                <ul className="space-y-3 mb-6 divide-y divide-gold-100">
                                    {order.order_items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between pt-3 first:pt-0 text-sm">
                                            <span className="text-charcoal-700 font-light">{item.product_name}</span>
                                            <span className="text-navy-900 font-mono">× {item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>

                                {order.discount_applied && order.discount_applied > 0 && (
                                    <div className="flex justify-between items-center pt-3 border-t border-gold-200 text-sm font-light">
                                        <span className="text-charcoal-500">Discount {order.promo_code ? `(${order.promo_code})` : ''}</span>
                                        <span className="text-emerald-700 font-mono">−₱{order.discount_applied.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-baseline pt-4 border-t border-gold-300 mt-3">
                                    <span className="text-[11px] uppercase tracking-[0.32em] text-gold-600">Total</span>
                                    <span className="font-heading text-2xl text-navy-900">
                                        ₱{(order.total_price + (order.shipping_fee || 0)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!hasSearched && (
                    <div className="border border-dashed border-gold-300 p-10 text-center bg-white/50">
                        <Search className="w-10 h-10 mx-auto mb-4 text-gold-400" strokeWidth={1.2} />
                        <p className="text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-2">Awaiting Search</p>
                        <p className="text-sm text-charcoal-500 font-light max-w-md mx-auto">
                            Your order number was provided in your confirmation message. It starts with <span className="font-mono text-navy-900">PLP-</span> followed by four digits.
                        </p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default OrderTracking;
