import { useState, useEffect } from 'react';
import { X, Mail, Sparkles } from 'lucide-react';
import posthog from 'posthog-js';
import { supabase } from '../lib/supabase';

const POPUP_DISMISSED_KEY = 'biorich_popup_dismissed';

export default function WelcomePopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const dismissed = localStorage.getItem(POPUP_DISMISSED_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setVisible(false);
    localStorage.setItem(POPUP_DISMISSED_KEY, 'true');
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up"
        style={{ background: 'linear-gradient(180deg, #EAF4FA 0%, #FFFFFF 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-pink-100 transition-colors z-10"
        >
          <X size={20} className="text-pink-400" />
        </button>

        {/* Decorative top ribbon */}
        <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #A8D5E5, #5FA8C8, #A8D5E5)' }} />

        <div className="px-8 pt-8 pb-8 text-center">
          {status === 'success' ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
                  <Sparkles size={32} className="text-pink-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-pink-700 font-display mb-2">
                You're In!
              </h2>
              <p className="text-pink-600/80 mb-6">
                We'll notify you when exclusive discounts and promos are available.
              </p>
              <button
                onClick={close}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #A8D5E5, #5FA8C8)' }}
              >
                Start Shopping
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
                  <Mail size={32} className="text-pink-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-pink-700 font-display mb-1">
                Welcome to VrJonina website!
              </h2>
              <p className="text-pink-600/70 text-sm mb-6">
                Subscribe with your email and be the first to know about exclusive discounts & promos!
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === 'error') setStatus('idle');
                    }}
                    placeholder="Enter your email"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-pink-200 bg-white/80 text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #A8D5E5, #5FA8C8)' }}
                >
                  {status === 'loading' ? 'Subscribing...' : 'Subscribe for Discounts'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
