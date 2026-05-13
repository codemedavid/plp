import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen font-cute" style={{ background: 'linear-gradient(180deg, #F5FAFD, #FFFFFF)' }}>
            <div className="bg-white border-b-4 border-brand-500 sticky top-0 z-10 shadow-soft">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <a href="/" className="p-2 hover:bg-brand-50 rounded-2xl transition-colors group">
                            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-brand-600" />
                        </a>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-black" />
                            <h1 className="text-xl md:text-2xl font-bold font-cute text-charcoal-900">Privacy Policy</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="bg-white rounded-2xl shadow-soft border border-brand-100 p-6 md:p-10 space-y-8 text-charcoal-900">

                    <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">1. Information We Collect</h2>
                        <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-700">
                            <li><strong>Contact details:</strong> name, email, phone/WhatsApp number, and delivery address.</li>
                            <li><strong>Order information:</strong> products purchased, payment confirmation, and tracking information.</li>
                            <li><strong>Account data:</strong> if you create an account, your login credentials and saved preferences.</li>
                            <li><strong>Usage data:</strong> cookies, device information, and browsing activity used to improve our site.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">2. How We Use Your Information</h2>
                        <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-700">
                            <li>To process and ship your orders.</li>
                            <li>To contact you regarding your order, account, or support requests.</li>
                            <li>To send promotional messages and updates (you may opt out at any time).</li>
                            <li>To improve our products, services, and website experience.</li>
                            <li>To comply with legal obligations and prevent fraudulent activity.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">3. Sharing of Information</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            We do not sell or rent your personal information. We only share data with trusted third parties necessary to fulfill your order, such as courier providers and payment processors, or when required by law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">4. Data Security</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            We implement reasonable safeguards to protect your information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">5. Cookies</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            Our website uses cookies to enhance functionality, remember your cart, and analyze site traffic. You can disable cookies in your browser settings, though some features may not work properly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">6. Your Rights</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            Under the Philippine Data Privacy Act of 2012 (RA 10173), you have the right to access, correct, or request the deletion of your personal data. To exercise these rights, contact us through our support channels.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">7. Children's Privacy</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            Our site is not intended for individuals under the age of 21. We do not knowingly collect information from minors.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">8. Changes to this Policy</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised "Last updated" date.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">9. Contact Us</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            For questions about this Privacy Policy or your personal data, please contact us via WhatsApp or our support channels.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
