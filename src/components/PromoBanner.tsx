import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import posthog from 'posthog-js';

const BANNER_DISMISSED_KEY = 'plp_banner_dismissed';

export default function PromoBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(BANNER_DISMISSED_KEY) === 'true');

  const handleShareClick = () => {
    posthog.capture('plp_promo_banner_referral_click');
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
                Earn Monthly
              </span>
              <span className="text-[12px] sm:text-sm font-light tracking-wide whitespace-nowrap">
                Share your <span className="text-gold-400 font-medium">referral code</span> to earn monthly
              </span>
            </div>

            {/* CTA */}
            <a
              href="/user/profile"
              onClick={handleShareClick}
              className="group inline-flex items-center gap-2 pl-4 pr-1 py-2 text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] uppercase text-gold-500 hover:text-gold-300 transition-colors whitespace-nowrap"
            >
              Share Your Code
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
            </a>
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

    </>
  );
}
