import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Inbox, PackageCheck, ShieldCheck } from 'lucide-react';
import type { OrderPlacedSummary } from '../../lib/orderPlacedSummary';
import { formatPrice } from '../../utils/currency';

interface OrderPlacedPanelProps {
    /** Null when the page is opened directly, refreshed, or shared. */
    summary: OrderPlacedSummary | null;
}

const firstNameOf = (fullName: string): string => fullName.trim().split(/\s+/)[0] || '';

/**
 * Post-checkout confirmation. The customer is told the order is recorded and
 * that everything from here — confirmation, status changes, order details —
 * arrives by email, so there is no other channel they need to watch.
 */
const OrderPlacedPanel: React.FC<OrderPlacedPanelProps> = ({ summary }) => {
    const firstName = summary ? firstNameOf(summary.customerName) : '';
    const hasItems = Boolean(summary && summary.items.length > 0);

    return (
        <>
            {/* Hero band */}
            <section className="relative overflow-hidden bg-cream-light border-b border-gold-200" aria-labelledby="order-placed-heading">
                <div className="container mx-auto px-4 md:px-8 py-16 md:py-20 max-w-4xl">
                    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-5">
                        <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.8} />
                        Order Received
                    </span>
                    <h1
                        id="order-placed-heading"
                        className="font-heading text-5xl md:text-6xl lg:text-7xl font-normal leading-[0.95] text-navy-900 tracking-tight mb-6"
                    >
                        Order Placed
                    </h1>
                    <div className="w-12 h-px bg-gold-500 mb-6" />
                    <p className="text-base md:text-lg text-charcoal-500 font-light leading-relaxed max-w-lg">
                        {firstName ? `Thank you, ${firstName}. ` : 'Thank you. '}
                        Your order is recorded and waiting for our team to verify your payment.
                    </p>

                    {summary && (
                        <div className="mt-10 inline-block bg-white border border-gold-200 px-6 py-4" style={{ borderRadius: '2px' }}>
                            <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-2">
                                Order Reference
                            </span>
                            <span className="block text-2xl md:text-3xl font-mono tracking-wider text-navy-900">
                                {summary.orderNumber}
                            </span>
                        </div>
                    )}
                </div>
            </section>

            <main className="container mx-auto px-4 md:px-8 py-12 md:py-16 max-w-4xl">
                {/* What happens next — all of it by email */}
                <section
                    className="bg-white border border-gold-200 p-6 md:p-10 mb-8"
                    style={{ borderRadius: '2px' }}
                    aria-labelledby="email-next-heading"
                >
                    <div className="flex items-start gap-4 mb-6">
                        <span className="shrink-0 w-11 h-11 bg-cream-light border border-gold-200 flex items-center justify-center" style={{ borderRadius: '2px' }}>
                            <Mail className="w-5 h-5 text-gold-600" strokeWidth={1.8} />
                        </span>
                        <div>
                            <h2 id="email-next-heading" className="font-heading text-2xl md:text-3xl font-normal text-navy-900 tracking-tight mb-2">
                                Watch your inbox
                            </h2>
                            {summary?.email ? (
                                <p className="text-charcoal-500 font-light leading-relaxed">
                                    Your confirmation email is on its way to{' '}
                                    <strong className="font-medium text-navy-900 break-words">{summary.email}</strong>
                                    {' '}with your full order details.
                                </p>
                            ) : (
                                <p className="text-charcoal-500 font-light leading-relaxed">
                                    Your confirmation email is on its way to the address you entered at checkout, with your full order details.
                                </p>
                            )}
                        </div>
                    </div>

                    <ul className="space-y-5 border-t border-gold-200/70 pt-6">
                        <li className="flex items-start gap-4">
                            <Inbox className="w-4 h-4 text-gold-600 mt-1 shrink-0" strokeWidth={1.8} />
                            <p className="text-sm text-charcoal-500 font-light leading-relaxed">
                                If it is not in your inbox within a few minutes, check Spam and Promotions, then mark it as “Not spam” so later updates land properly.
                            </p>
                        </li>
                        <li className="flex items-start gap-4">
                            <PackageCheck className="w-4 h-4 text-gold-600 mt-1 shrink-0" strokeWidth={1.8} />
                            <p className="text-sm text-charcoal-500 font-light leading-relaxed">
                                Every status update is emailed to you as well — confirmed, processing, shipped, and delivered — each with your order details and tracking once dispatched.
                            </p>
                        </li>
                        <li className="flex items-start gap-4">
                            <ShieldCheck className="w-4 h-4 text-gold-600 mt-1 shrink-0" strokeWidth={1.8} />
                            <p className="text-sm text-charcoal-500 font-light leading-relaxed">
                                Payment verification is usually completed within 24 hours. Orders verified before 11 AM ship the same day.
                            </p>
                        </li>
                    </ul>
                </section>

                {/* Order recap */}
                {summary && hasItems && (
                    <section
                        className="bg-cream-light border border-gold-200 p-6 md:p-10 mb-10"
                        style={{ borderRadius: '2px' }}
                        aria-labelledby="order-summary-heading"
                    >
                        <h2 id="order-summary-heading" className="text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-6">
                            Order Summary
                        </h2>

                        <ul className="divide-y divide-gold-200/70 mb-6">
                            {summary.items.map((item, index) => (
                                <li key={`${item.name}-${index}`} className="flex items-baseline justify-between gap-4 py-3">
                                    <span className="text-navy-900 font-light">{item.name}</span>
                                    <span className="flex items-baseline gap-4 shrink-0">
                                        <span className="text-xs text-charcoal-400 tabular-nums">×{item.quantity}</span>
                                        <span className="text-navy-900 tabular-nums">{formatPrice(item.total)}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <dl className="space-y-2 text-sm border-t border-gold-200/70 pt-5">
                            <div className="flex items-baseline justify-between gap-4">
                                <dt className="text-charcoal-500 font-light">Subtotal</dt>
                                <dd className="text-navy-900 tabular-nums">{formatPrice(summary.subtotal)}</dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-4">
                                <dt className="text-charcoal-500 font-light">Shipping</dt>
                                <dd className="text-navy-900 tabular-nums">{formatPrice(summary.shippingFee)}</dd>
                            </div>
                            {summary.discount > 0 && (
                                <div className="flex items-baseline justify-between gap-4">
                                    <dt className="text-charcoal-500 font-light">Promo discount</dt>
                                    <dd className="text-gold-700 tabular-nums">{`-${formatPrice(summary.discount)}`}</dd>
                                </div>
                            )}
                            {summary.pointsRedeemed > 0 && (
                                <div className="flex items-baseline justify-between gap-4">
                                    <dt className="text-charcoal-500 font-light">Points redeemed</dt>
                                    <dd className="text-gold-700 tabular-nums">{`-${formatPrice(summary.pointsRedeemed)}`}</dd>
                                </div>
                            )}
                            <div className="flex items-baseline justify-between gap-4 border-t border-gold-200/70 pt-4 mt-4">
                                <dt className="text-[11px] uppercase tracking-[0.22em] text-navy-900 font-semibold">Total</dt>
                                <dd className="font-heading text-2xl text-navy-900 tabular-nums">{formatPrice(summary.total)}</dd>
                            </div>
                        </dl>
                    </section>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/track-order"
                        className="group inline-flex items-center justify-between gap-6 px-7 py-4 bg-navy-900 text-white text-xs font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 transition-colors"
                        style={{ borderRadius: '2px' }}
                    >
                        Track My Order
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
                    </Link>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-7 py-4 border border-gold-300 text-navy-900 text-xs font-semibold tracking-[0.22em] uppercase hover:border-gold-500 hover:bg-cream-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 transition-colors"
                        style={{ borderRadius: '2px' }}
                    >
                        Continue Shopping
                    </Link>
                </div>
            </main>
        </>
    );
};

export default OrderPlacedPanel;
