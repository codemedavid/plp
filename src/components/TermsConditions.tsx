import React from 'react';
import Seo from './seo/Seo';
import { ArrowLeft, FileText } from 'lucide-react';

const TermsConditions: React.FC = () => {
    return (
        <div className="min-h-screen font-cute" style={{ background: 'linear-gradient(180deg, #F5FAFD, #FFFFFF)' }}>
            <Seo
                title="Terms & Conditions — Peptide Lifestyle Program"
                description="Terms and conditions for using the Peptide Lifestyle Program store and services."
                path="/terms"
            />
            <div className="bg-white border-b-4 border-brand-500 sticky top-0 z-10 shadow-soft">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <a href="/" className="p-2 hover:bg-brand-50 rounded-2xl transition-colors group">
                            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-brand-600" />
                        </a>
                        <div className="flex items-center gap-2">
                            <FileText className="w-6 h-6 text-black" />
                            <h1 className="text-xl md:text-2xl font-bold font-cute text-charcoal-900">Terms & Conditions</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="bg-white rounded-2xl shadow-soft border border-brand-100 p-6 md:p-10 space-y-8 text-charcoal-900">

                    <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">1. Acceptance of Terms</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            By accessing or using the Peptide Lifestyle Program ("PLP") website and placing an order, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use this site.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">2. Research Use Only</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            All products sold on this website are intended strictly for laboratory and research purposes only. They are not approved for human or animal consumption, diagnosis, cure, or prevention of any disease. By purchasing, you confirm that you are a qualified researcher and that you will handle the products responsibly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">3. Eligibility</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            You must be at least 21 years old to purchase from this site. By placing an order, you represent and warrant that you meet this age requirement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">4. Orders & Payments</h2>
                        <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-700">
                            <li>All orders are subject to acceptance and product availability.</li>
                            <li>Prices are listed in PHP and may change without prior notice.</li>
                            <li>We reserve the right to cancel any order for any reason, including suspected fraud or pricing errors.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">5. Shipping & Returns</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            Shipping, delivery, returns, and refund handling are governed by our <a href="/shipping-returns" className="text-brand-600 underline">Shipping & Returns</a> policy, which forms part of these Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">6. Intellectual Property</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            All content on this site — including text, images, logos, and branding — is the property of Peptide Lifestyle Program and may not be reproduced, distributed, or used without prior written consent.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">7. Limitation of Liability</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            To the maximum extent permitted by law, Peptide Lifestyle Program shall not be liable for any indirect, incidental, or consequential damages arising from your use of our products or website. The buyer assumes all risk associated with the handling and use of the products.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">8. Changes to Terms</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            We may update these Terms from time to time. Continued use of the site after changes constitutes acceptance of the revised Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg md:text-xl font-bold mb-3">9. Contact</h2>
                        <p className="text-sm md:text-base text-gray-700">
                            For questions regarding these Terms, please contact us via WhatsApp or through the support channels listed on our site.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default TermsConditions;
