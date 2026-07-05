import { useEffect, useState } from 'react';
import { X, ArrowRight, Send, type LucideIcon } from 'lucide-react';
import posthog from 'posthog-js';

const BANNER_DISMISSED_KEY = 'plp_banner_dismissed';
const ROTATE_INTERVAL_MS = 6000;

type BannerSlide = {
  id: string;
  eyebrow: string;
  message: React.ReactNode;
  cta: {
    label: string;
    href: string;
    external?: boolean;
    icon?: LucideIcon;
    event: string;
  };
};

const SLIDES: BannerSlide[] = [
  {
    id: 'assessment',
    eyebrow: 'New',
    message: (
      <>
        Find the right protocol for <span className="text-gold-400 font-medium">your goals</span> in 3 minutes
      </>
    ),
    cta: {
      label: 'Take the Assessment',
      href: '/assessment',
      event: 'plp_promo_banner_assessment_click',
    },
  },
  {
    id: 'referral',
    eyebrow: 'Earn Monthly',
    message: (
      <>
        Share your <span className="text-gold-400 font-medium">referral code</span> to earn monthly
      </>
    ),
    cta: {
      label: 'Share Your Code',
      href: '/user/profile',
      event: 'plp_promo_banner_referral_click',
    },
  },
  {
    id: 'telegram',
    eyebrow: 'Community',
    message: (
      <>
        Join our <span className="text-gold-400 font-medium">Telegram community</span> for drops &amp; offers
      </>
    ),
    cta: {
      label: 'Join Telegram',
      href: 'https://t.me/+BONrPhxaWOEzNGJl',
      external: true,
      icon: Send,
      event: 'plp_promo_banner_telegram_click',
    },
  },
];

export default function PromoBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISSED_KEY) === 'true'
  );
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-rotate through slides; pause on hover/focus.
  useEffect(() => {
    if (dismissed || paused || SLIDES.length <= 1) return;

    const id = setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length);
    }, ROTATE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [dismissed, paused]);

  const handleCtaClick = (event: string) => {
    posthog.capture(event);
  };

  const close = () => {
    setDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  if (dismissed) return null;

  return (
    <div
      className="relative w-full bg-navy-900 text-white overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Announcements"
    >
      {/* Top + bottom gold hairlines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-70" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-40" />

      <div className="container mx-auto px-4 sm:px-8 py-2.5 pr-10 sm:pr-12">
        <div className="relative">
          {SLIDES.map((slide, index) => {
            const isActive = index === active;
            const CtaIcon = slide.cta.icon ?? ArrowRight;

            return (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${SLIDES.length}`}
                aria-hidden={!isActive}
                className={`transition-opacity duration-500 ease-out ${
                  isActive
                    ? 'opacity-100 relative'
                    : 'opacity-0 absolute inset-0 pointer-events-none'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
                  {/* Message with eyebrow tag */}
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-flex items-center text-[10px] font-semibold tracking-[0.32em] uppercase text-gold-500">
                      <span className="w-6 h-px bg-gold-500 mr-3" />
                      {slide.eyebrow}
                    </span>
                    <span className="text-[12px] sm:text-sm font-light tracking-wide whitespace-nowrap">
                      {slide.message}
                    </span>
                  </div>

                  {/* CTA */}
                  <a
                    href={slide.cta.href}
                    {...(slide.cta.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    onClick={() => handleCtaClick(slide.cta.event)}
                    tabIndex={isActive ? 0 : -1}
                    className="group inline-flex items-center gap-2 pl-4 pr-1 py-2 text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] uppercase text-gold-500 hover:text-gold-300 transition-colors whitespace-nowrap"
                  >
                    {slide.cta.label}
                    <CtaIcon
                      className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                      strokeWidth={1.8}
                    />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carousel dots */}
      {SLIDES.length > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show slide ${index + 1}: ${slide.eyebrow}`}
              aria-current={index === active}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === active
                  ? 'w-4 bg-gold-500'
                  : 'w-1 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Close */}
      <button
        onClick={close}
        aria-label="Dismiss banner"
        className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-5 p-1 text-white/50 hover:text-gold-500 transition-colors"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
