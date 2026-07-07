import { useState, useEffect } from 'react';
import { X, Share2, Sparkles, Gift } from 'lucide-react';
import posthog from 'posthog-js';
import { useAuth } from '../hooks/useAuth';
import { SIGNUP_BONUS_POINTS, signupBonusPesos } from '../lib/rewards';

export default function WelcomePopup() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    setVisible(false);
  };

  const handleShareClick = () => {
    posthog.capture('plp_welcome_popup_referral_click');
    close();
    window.location.href = '/user/profile';
  };

  const handleSignUp = () => {
    posthog.capture('plp_welcome_popup_signup_click');
    close();
    window.dispatchEvent(new CustomEvent('open-auth'));
  };

  const handleSignIn = () => {
    close();
    window.dispatchEvent(new CustomEvent('open-auth'));
  };

  if (!visible) return null;

  const isSignedIn = Boolean(user);

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

        {isSignedIn ? (
          /* ---------------- Signed-in: invite & earn ---------------- */
          <div className="px-8 pt-10 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 border border-gold-500 flex items-center justify-center text-gold-600">
                <Sparkles size={26} strokeWidth={1.5} />
              </div>
            </div>
            <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-4">Earn Monthly</span>
            <h2 className="font-heading text-3xl md:text-4xl text-navy-900 leading-tight mb-3">
              Share Your<br />Referral Code
            </h2>
            <div className="w-10 h-px bg-gold-500 mx-auto mb-5" />
            <p className="text-sm text-charcoal-500 font-light leading-relaxed mb-8 max-w-xs mx-auto">
              Invite friends with your personal referral code and earn rewards every month they shop.
            </p>

            <button
              type="button"
              onClick={handleShareClick}
              className="group inline-flex w-full items-center justify-between gap-6 px-6 py-4 bg-navy-900 text-white text-xs font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 transition-all"
              style={{ borderRadius: '2px' }}
            >
              <span className="inline-flex items-center gap-2">
                <Share2 size={14} strokeWidth={1.8} />
                Share Your Code
              </span>
              <span className="text-gold-400">→</span>
            </button>
          </div>
        ) : (
          /* ---------------- Signed-out: welcome bonus ---------------- */
          <div className="px-8 pt-10 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 border border-gold-500 flex items-center justify-center text-gold-600">
                <Gift size={26} strokeWidth={1.5} />
              </div>
            </div>
            <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-4">Welcome Gift</span>
            <h2 className="font-heading text-3xl md:text-4xl text-navy-900 leading-tight mb-3">
              Get {SIGNUP_BONUS_POINTS} Points<br />When You Join
            </h2>
            <div className="w-10 h-px bg-gold-500 mx-auto mb-5" />
            <p className="text-sm text-charcoal-500 font-light leading-relaxed mb-8 max-w-xs mx-auto">
              Create your free account and we'll credit{' '}
              <span className="text-navy-900 font-medium">{SIGNUP_BONUS_POINTS} points</span> — worth{' '}
              <span className="text-navy-900 font-medium">{signupBonusPesos()}</span> — to redeem at checkout on your first order.
            </p>

            <button
              type="button"
              onClick={handleSignUp}
              className="group inline-flex w-full items-center justify-between gap-6 px-6 py-4 bg-navy-900 text-white text-xs font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 transition-all mb-3"
              style={{ borderRadius: '2px' }}
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles size={14} strokeWidth={1.8} />
                Sign Up &amp; Claim {SIGNUP_BONUS_POINTS} Points
              </span>
              <span className="text-gold-400">→</span>
            </button>

            <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal-500 text-center pt-2">
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleSignIn}
                className="text-gold-600 hover:text-navy-900 underline underline-offset-4 decoration-gold-300 hover:decoration-navy-900 transition-colors font-semibold"
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
