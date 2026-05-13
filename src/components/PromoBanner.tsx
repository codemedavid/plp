import { useState, useEffect } from 'react';
import { X, Check, Sparkles, ArrowRight } from 'lucide-react';
import posthog from 'posthog-js';

const BANNER_DISMISSED_KEY = 'plp_banner_dismissed';

export default function PromoBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(BANNER_DISMISSED_KEY) === 'true');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  useEffect(() => {
    if (showConfirmPopup) {
      const timer = setTimeout(() => setShowConfirmPopup(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showConfirmPopup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      return;
    }

    setStatus('success');
    setShowConfirmPopup(true);
    posthog.capture('plp_promo_banner', { email: trimmed });
  };

  const close = () => {
    setDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  if (dismissed) return null;

  return (
    <>
      {/* Banner — luxury navy with gold hairline accents */}
      <div className="relative w-full bg-navy-900 text-white overflow-hidden">
        {/* Top + bottom gold hairlines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-70" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-40" />

        <div className="container mx-auto px-4 sm:px-8 py-2.5 pr-10 sm:pr-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">

            {/* Message with eyebrow tag */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center text-[10px] font-semibold tracking-[0.32em] uppercase text-gold-500">
                <span className="w-6 h-px bg-gold-500 mr-3" />
                Exclusive
              </span>
              <span className="text-[12px] sm:text-sm font-light tracking-wide whitespace-nowrap">
                Join the Inner Circle for <span className="text-gold-400 font-medium">early access & private offers</span>
              </span>
            </div>

            {/* Form */}
            {status === 'success' ? (
              <span className="inline-flex items-center gap-2 text-[12px] sm:text-sm font-medium text-gold-400">
                <Check className="w-4 h-4" strokeWidth={2} />
                You're on the list.
              </span>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-stretch gap-0">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
                  placeholder="your@email.com"
                  className={`px-3.5 py-2 text-[12px] sm:text-[13px] bg-transparent text-white placeholder-white/40 border-b focus:outline-none transition-colors w-44 sm:w-60 ${
                    status === 'error' ? 'border-red-400' : 'border-white/30 focus:border-gold-500'
                  }`}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="group inline-flex items-center gap-2 pl-4 pr-1 py-2 text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] uppercase text-gold-500 hover:text-gold-300 transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {status === 'loading' ? '...' : 'Subscribe'}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Close */}
        <button
          onClick={close}
          aria-label="Dismiss banner"
          className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-5 p-1 text-white/50 hover:text-gold-500 transition-colors"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setShowConfirmPopup(false)}>
          <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white shadow-luxury overflow-hidden animate-fade-in-up border border-gold-300"
            style={{ borderRadius: '2px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gold-500" />
            <div className="px-8 pt-8 pb-8 text-center">
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-full border border-gold-500 flex items-center justify-center text-gold-600">
                  <Sparkles size={24} strokeWidth={1.4} />
                </div>
              </div>
              <p className="text-[10px] font-semibold tracking-[0.32em] uppercase text-gold-600 mb-3">
                Welcome
              </p>
              <h2 className="font-heading text-2xl font-normal text-navy-900 mb-3 tracking-tight">
                You're In.
              </h2>
              <p className="text-charcoal-500 text-sm font-light leading-relaxed mb-7">
                Look out for early access to new products and private offers — delivered with care.
              </p>
              <button
                onClick={() => setShowConfirmPopup(false)}
                className="w-full py-3.5 text-[11px] font-semibold tracking-[0.22em] uppercase bg-navy-900 text-white hover:bg-navy-700 transition-colors"
                style={{ borderRadius: '2px' }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
