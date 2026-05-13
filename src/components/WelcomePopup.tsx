import { useState, useEffect } from 'react';
import { X, Mail, Sparkles } from 'lucide-react';
import posthog from 'posthog-js';
import { supabase } from '../lib/supabase';

export default function WelcomePopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    setVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('loading');

    // Only capture event — do NOT identify here to avoid cross-customer
    // identity merging when a different customer checks out later on the same device
    posthog.capture('vrjonina_promo', { email: trimmed, $set: { email: trimmed } }, { send_instantly: true });

    // Send welcome email via edge function (fire and forget — don't block the UI)
    supabase.functions.invoke('send-promo-welcome', {
      body: { email: trimmed },
    }).catch((err) => console.error('Failed to send welcome email:', err));

    setStatus('success');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={close}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-cream-light border border-gold-300 shadow-2xl overflow-hidden animate-fade-in-up"
        style={{ borderRadius: '2px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gold rule */}
        <div className="h-px w-full bg-gold-500" />

        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 text-charcoal-400 hover:text-navy-900 transition-colors z-10"
          aria-label="Close"
        >
          <X size={18} strokeWidth={1.8} />
        </button>

        <div className="px-8 pt-10 pb-8 text-center">
          {status === 'success' ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 border border-gold-500 flex items-center justify-center text-gold-600">
                  <Sparkles size={26} strokeWidth={1.5} />
                </div>
              </div>
              <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-4">Confirmed</span>
              <h2 className="font-heading text-3xl md:text-4xl text-navy-900 leading-tight mb-3">
                You're On The List
              </h2>
              <div className="w-10 h-px bg-gold-500 mx-auto mb-5" />
              <p className="text-sm text-charcoal-500 font-light leading-relaxed mb-8 max-w-xs mx-auto">
                We'll notify you when exclusive discounts and promos are available.
              </p>
              <button
                onClick={close}
                className="group inline-flex w-full items-center justify-between gap-6 px-6 py-4 bg-navy-900 text-white text-xs font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 transition-all"
                style={{ borderRadius: '2px' }}
              >
                Start Shopping
                <span className="text-gold-400">→</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 border border-gold-500 flex items-center justify-center text-gold-600">
                  <Mail size={26} strokeWidth={1.5} />
                </div>
              </div>
              <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-4">Members Only</span>
              <h2 className="font-heading text-3xl md:text-4xl text-navy-900 leading-tight mb-3">
                Welcome to<br />Peptide Lifestyle Program
              </h2>
              <div className="w-10 h-px bg-gold-500 mx-auto mb-5" />
              <p className="text-sm text-charcoal-500 font-light leading-relaxed mb-8 max-w-xs mx-auto">
                Subscribe with your email and be the first to know about exclusive discounts and promos.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.32em] text-gold-600 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={16} strokeWidth={1.8} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === 'error') setStatus('idle');
                      }}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 border border-gold-200 bg-white focus:bg-white focus:border-gold-500 outline-none transition-all text-navy-900 placeholder:text-charcoal-400 font-light"
                      style={{ borderRadius: '2px' }}
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <p className="text-xs text-rose-700 font-light">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  onClick={(e) => e.stopPropagation()}
                  className="group inline-flex w-full items-center justify-between gap-6 px-6 py-4 bg-navy-900 text-white text-xs font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderRadius: '2px' }}
                >
                  {status === 'loading' ? (
                    <>
                      <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                      Subscribing
                    </>
                  ) : (
                    <>
                      Subscribe
                      <span className="text-gold-400">→</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal-500 text-center pt-2">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      close();
                      window.dispatchEvent(new CustomEvent('open-auth'));
                    }}
                    className="text-gold-600 hover:text-navy-900 underline underline-offset-4 decoration-gold-300 hover:decoration-navy-900 transition-colors font-semibold"
                  >
                    Sign In or Sign Up
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
