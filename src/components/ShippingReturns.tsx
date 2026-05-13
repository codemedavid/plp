import React from 'react';
import { ArrowLeft, Truck } from 'lucide-react';

const ShippingReturns: React.FC = () => {
    return (
        <div className="min-h-screen font-cute" style={{ background: 'linear-gradient(180deg, #F5FAFD, #FFFFFF)' }}>
            <div className="bg-white border-b-4 border-brand-500 sticky top-0 z-10 shadow-soft">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <a href="/" className="p-2 hover:bg-brand-50 rounded-2xl transition-colors group">
                            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-brand-600" />
                        </a>
                        <div className="flex items-center gap-2">
                            <Truck className="w-6 h-6 text-black" />
                            <h1 className="text-xl md:text-2xl font-bold font-cute text-charcoal-900">Shipping & Returns</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="bg-white rounded-2xl shadow-soft border border-brand-100 p-6 md:p-10 space-y-8 text-charcoal-900">

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">Shipping</h2>
                        <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-700">
                            <li>Orders are processed within 1–2 business days after payment confirmation.</li>
                            <li>Once shipped, you will receive a tracking number via WhatsApp or email.</li>
                            <li>Estimated delivery within Metro Manila: 1–3 business days. Provincial: 3–7 business days.</li>
                            <li>Shipping rates are calculated at checkout based on your selected courier and location.</li>
                            <li>Peptide Lifestyle Program is not liable for courier delays caused by weather, holidays, or other unforeseen events.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">Order Tracking</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            You can track your order anytime via the <a href="/track-order" className="text-brand-600 underline">Track Order</a> page using your order number and contact details.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">Returns & Refunds</h2>
                        <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-700">
                            <li>Due to the nature of our products, all sales are final once the package is opened.</li>
                            <li>If you received a damaged, defective, or incorrect item, please contact us within 48 hours of delivery with photos of the product and packaging.</li>
                            <li>Approved replacements will be shipped at no extra cost. Refunds, where applicable, will be issued to the original payment method within 7–14 business days.</li>
                            <li>We do not accept returns for change-of-mind, incorrect ordering, or unclaimed parcels.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">Failed or Refused Deliveries</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            If a parcel is returned to us due to an incorrect address, unanswered calls, or refusal to accept delivery, re-shipping fees will be shouldered by the customer.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">Contact</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            For any shipping or return concerns, please reach out to us via WhatsApp before opening a dispute so we can resolve your issue quickly.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default ShippingReturns;
