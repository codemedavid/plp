import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, X, ExternalLink, ArrowLeft, Copy, Check, FlaskConical, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCOAPageSetting } from '../hooks/useCOAPageSetting';
import Header from './Header';
import Footer from './Footer';
import { useCart } from '../hooks/useCart';

interface COAReport {
  id: string;
  product_name: string;
  batch: string;
  test_date: string;
  purity_percentage: number;
  quantity: string;
  task_number: string;
  verification_key: string;
  image_url: string;
  featured: boolean;
  laboratory: string;
}

const COA: React.FC = () => {
  const { cartItems } = useCart();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [coaReports, setCOAReports] = useState<COAReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { coaPageEnabled, loading: settingLoading } = useCOAPageSetting();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    const fetchCOAReports = async () => {
      try {
        const { data, error } = await supabase
          .from('coa_reports')
          .select('*')
          .order('test_date', { ascending: false });

        if (error) throw error;
        setCOAReports(data || []);
      } catch (error) {
        console.error('Error fetching COA reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCOAReports();
  }, []);

  if (settingLoading || loading) {
    return (
      <div className="min-h-screen bg-cream-light flex items-center justify-center">
        <div className="w-10 h-10 border border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!coaPageEnabled) {
    return (
      <div className="min-h-screen bg-cream-light flex items-center justify-center px-4">
        <div className="max-w-md text-center border border-gold-200 bg-white p-12">
          <div className="w-14 h-14 border border-gold-300 flex items-center justify-center text-gold-600 mx-auto mb-6">
            <Shield className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-3">Unavailable</span>
          <h1 className="font-heading text-3xl text-navy-900 mb-3">Lab Reports</h1>
          <p className="text-sm text-charcoal-500 font-light mb-8">The COA page is currently disabled.</p>
          <a
            href="/"
            className="inline-flex items-center gap-3 px-6 py-3 bg-navy-900 text-white text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 transition-colors"
            style={{ borderRadius: '2px' }}
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <div className="min-h-screen bg-cream-light">
      <Header
        cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => { }}
        onMenuClick={() => { window.location.href = '/'; }}
      />

      {/* Hero band */}
      <section className="relative overflow-hidden bg-cream-light border-b border-gold-200">
        <div className="container mx-auto px-4 md:px-8 py-16 md:py-20 max-w-6xl">
          <a
            href="/"
            className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-charcoal-500 hover:text-navy-900 transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" strokeWidth={1.8} />
            Back to Home
          </a>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
            <div className="max-w-2xl">
              <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-5">Lab Verified</span>
              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-normal leading-[0.95] text-navy-900 tracking-tight mb-6">
                Certificate<br />of Analysis
              </h1>
              <div className="w-12 h-px bg-gold-500 mb-6" />
              <p className="text-base md:text-lg text-charcoal-500 font-light leading-relaxed max-w-md">
                Every batch independently tested by{' '}
                <span className="text-navy-900 font-medium">Janoshik Analytical</span> and{' '}
                <span className="text-navy-900 font-medium">Chromate</span> for purity and concentration.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-10 gap-y-5 lg:justify-end">
              {[
                { icon: CheckCircle, label: '99%+\nPurity' },
                { icon: Award, label: 'Independently\nCertified' },
                { icon: Shield, label: 'Batch\nVerified' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border border-gold-300 flex items-center justify-center text-gold-600">
                    <b.icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-medium text-navy-900 leading-tight whitespace-pre-line tracking-wide">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 md:px-8 py-16 max-w-6xl">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-4">The Reports</span>
          <h2 className="font-heading text-4xl md:text-5xl font-normal text-navy-900 tracking-tight mb-4">
            Latest Lab Results
          </h2>
          <div className="w-12 h-px bg-gold-500 mx-auto mb-5" />
          <p className="text-sm text-charcoal-500 font-light max-w-xl mx-auto">
            Click any certificate to view the full report. Verify authenticity directly with the issuing laboratory.
          </p>
        </div>

        {coaReports.length === 0 ? (
          <div className="border border-dashed border-gold-300 bg-white/50 p-16 text-center">
            <Shield className="w-12 h-12 mx-auto mb-5 text-gold-400" strokeWidth={1.2} />
            <p className="text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-2">No Reports Yet</p>
            <p className="text-sm text-charcoal-500 font-light">Lab reports will appear here once published.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gold-200 border border-gold-200">
            {coaReports.map((report) => {
              const isJanoshik = !report.laboratory || report.laboratory.toLowerCase().includes('janoshik');
              const verificationUrl = isJanoshik
                ? `https://www.janoshik.com/verify/?key=${report.verification_key}`
                : 'https://chromate.org';
              const labLabel = isJanoshik ? 'Janoshik' : 'Chromate';

              return (
                <article key={report.id} className="bg-white flex flex-col">
                  {/* Image */}
                  <button
                    type="button"
                    onClick={() => setSelectedImage(report.image_url)}
                    className="relative block group overflow-hidden bg-cream-light"
                  >
                    <img
                      src={report.image_url}
                      alt={`${report.product_name} Certificate of Analysis`}
                      className="w-full h-72 object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23F5F1EA" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23C9A876" font-size="14" font-family="serif"%3ECertificate Image Coming Soon%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/40 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-5 py-2.5 text-[10px] uppercase tracking-[0.32em] text-navy-900 flex items-center gap-2 border border-gold-500">
                        <ExternalLink className="w-3 h-3" strokeWidth={1.8} />
                        View Full Report
                      </span>
                    </div>

                    {report.featured && (
                      <span className="absolute top-4 left-4 bg-white border border-gold-500 text-[9px] uppercase tracking-[0.32em] text-gold-700 px-3 py-1.5 font-semibold">
                        ✓ Verified
                      </span>
                    )}
                    <span className="absolute top-4 right-4 bg-navy-900 text-white text-[9px] uppercase tracking-[0.32em] px-3 py-1.5 font-semibold">
                      {labLabel}
                    </span>
                  </button>

                  {/* Details */}
                  <div className="p-6 md:p-8 flex-1 flex flex-col">
                    <div className="mb-5">
                      <span className="block text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-2">Product</span>
                      <h3 className="font-heading text-2xl text-navy-900 leading-tight">{report.product_name}</h3>
                    </div>

                    <dl className="divide-y divide-gold-100 mb-6">
                      <div className="flex items-center justify-between py-3">
                        <dt className="text-[10px] uppercase tracking-[0.32em] text-gold-600">Purity</dt>
                        <dd className="font-heading text-xl text-navy-900">{report.purity_percentage}%</dd>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <dt className="text-[10px] uppercase tracking-[0.32em] text-gold-600">Quantity</dt>
                        <dd className="text-sm text-navy-900 font-mono">{report.quantity}</dd>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <dt className="text-[10px] uppercase tracking-[0.32em] text-gold-600">Test Date</dt>
                        <dd className="text-sm text-charcoal-700 font-light">{formatDate(report.test_date)}</dd>
                      </div>
                      <div className="flex items-center justify-between py-3 gap-3">
                        <dt className="text-[10px] uppercase tracking-[0.32em] text-gold-600 flex-shrink-0">Task</dt>
                        <dd className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-mono text-navy-900 truncate">#{report.task_number}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(report.task_number, `${report.id}-task`)}
                            className="w-7 h-7 border border-gold-200 flex items-center justify-center text-gold-600 hover:border-gold-500 hover:bg-cream-light transition-colors flex-shrink-0"
                            title="Copy task number"
                          >
                            {copiedId === `${report.id}-task` ? (
                              <Check className="w-3 h-3 text-emerald-600" strokeWidth={2} />
                            ) : (
                              <Copy className="w-3 h-3" strokeWidth={1.8} />
                            )}
                          </button>
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-3 gap-3">
                        <dt className="text-[10px] uppercase tracking-[0.32em] text-gold-600 flex-shrink-0">Verification Key</dt>
                        <dd className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-mono text-navy-900 truncate">{report.verification_key}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(report.verification_key, `${report.id}-key`)}
                            className="w-7 h-7 border border-gold-200 flex items-center justify-center text-gold-600 hover:border-gold-500 hover:bg-cream-light transition-colors flex-shrink-0"
                            title="Copy verification key"
                          >
                            {copiedId === `${report.id}-key` ? (
                              <Check className="w-3 h-3 text-emerald-600" strokeWidth={2} />
                            ) : (
                              <Copy className="w-3 h-3" strokeWidth={1.8} />
                            )}
                          </button>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto space-y-2.5">
                      <a
                        href={verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between gap-4 px-5 py-3.5 bg-navy-900 text-white text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 transition-colors"
                        style={{ borderRadius: '2px' }}
                      >
                        <span className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5" strokeWidth={1.8} />
                          Verify on {labLabel}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(report.image_url)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 border border-gold-500 text-navy-900 text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-gold-500 hover:text-white transition-colors"
                        style={{ borderRadius: '2px' }}
                      >
                        View Full Certificate
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Lab partners */}
        <section className="mt-20 border-t border-gold-200 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
            <div className="md:col-span-1">
              <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-4">Our Partners</span>
              <h3 className="font-heading text-3xl md:text-4xl text-navy-900 leading-tight mb-4">
                Independent Verification
              </h3>
              <div className="w-12 h-px bg-gold-500" />
            </div>

            <div className="md:col-span-2 space-y-6">
              <p className="text-base text-charcoal-700 font-light leading-relaxed max-w-2xl">
                We partner with top-tier third-party laboratories to ensure the highest quality standards.
                Each batch is rigorously tested for purity and concentration using HPLC and Mass Spectrometry.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gold-200 border border-gold-200">
                <a
                  href="https://www.janoshik.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white p-6 flex items-center justify-between hover:bg-cream-light transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 border border-gold-300 flex items-center justify-center text-gold-600 group-hover:border-gold-500 transition-colors">
                      <FlaskConical className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-1">Laboratory</span>
                      <span className="font-heading text-lg text-navy-900">Janoshik Analytical</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-charcoal-400 group-hover:text-navy-900 group-hover:translate-x-0.5 transition-all" strokeWidth={1.8} />
                </a>

                <a
                  href="https://chromate.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white p-6 flex items-center justify-between hover:bg-cream-light transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 border border-gold-300 flex items-center justify-center text-gold-600 group-hover:border-gold-500 transition-colors">
                      <FlaskConical className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-1">Laboratory</span>
                      <span className="font-heading text-lg text-navy-900">Chromate</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-charcoal-400 group-hover:text-navy-900 group-hover:translate-x-0.5 transition-all" strokeWidth={1.8} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-navy-900/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full max-w-5xl">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 flex items-center gap-2 px-4 py-2 bg-white border border-gold-500 text-navy-900 text-[10px] uppercase tracking-[0.32em] hover:bg-gold-500 hover:text-white transition-colors"
              style={{ borderRadius: '2px' }}
            >
              Close
              <X className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
            <img
              src={selectedImage}
              alt="Certificate of Analysis"
              className="w-full h-auto border border-gold-300 shadow-luxury"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default COA;
