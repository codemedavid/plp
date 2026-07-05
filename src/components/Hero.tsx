import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

interface HeroProps {
  onShopAll: () => void;
}

const AUTO_ADVANCE_MS = 5000;

type HeroSlide =
  | { kind: 'image'; src: string }
  | { kind: 'assessment' }
  | { kind: 'referral' }
  | { kind: 'research' };

const Hero: React.FC<HeroProps> = ({ onShopAll }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { siteSettings } = useSiteSettings();
  const images = (siteSettings?.hero_images && siteSettings.hero_images.length > 0)
    ? siteSettings.hero_images
    : ['/hero-plp-slim.jpg'];

  // Admins toggle the assessment slide and its position in Site Settings →
  // Hero Carousel (shown by default, last unless made the primary slide).
  const showAssessmentSlide = siteSettings?.hero_show_assessment_slide !== false;
  const assessmentFirst = siteSettings?.hero_assessment_slide_position === 'first';
  const imageSlides: HeroSlide[] = images.map((src) => ({ kind: 'image', src }));
  const assessmentSlide: HeroSlide = { kind: 'assessment' };
  const referralSlide: HeroSlide = { kind: 'referral' };
  const researchSlide: HeroSlide = { kind: 'research' };
  const baseSlides: HeroSlide[] = showAssessmentSlide
    ? assessmentFirst
      ? [assessmentSlide, ...imageSlides]
      : [...imageSlides, assessmentSlide]
    : imageSlides;
  // The referral invite always rides second-to-last; the research-library slide
  // always closes the rotation.
  const slides: HeroSlide[] = [...baseSlides, referralSlide, researchSlide];
  const slideCount = slides.length;

  const [current, setCurrent] = useState(0);

  // Each carousel slide has its own natural height (a landscape banner image is
  // far shorter than the tall assessment slide). Slides share one flex row, so
  // without intervention the row grows to the tallest slide and shorter slides
  // get vertically centered — leaving empty bands above and below them on small
  // screens. We measure the active slide and pin the viewport to that height so
  // every slide fills its own frame with no gap.
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Track the active slide's height (and re-measure when its content, the image
  // load state, or the viewport width changes) so the frame always hugs it.
  useEffect(() => {
    const el = slideRefs.current[current];
    if (!el) return;

    const measure = () => setViewportHeight(el.offsetHeight);
    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [current, slideCount]);

  // Keep the active index valid if the number of slides changes.
  useEffect(() => {
    setCurrent((prev) => (prev >= slideCount ? 0 : prev));
  }, [slideCount]);

  // Auto-advance the carousel (skip when there's only one slide).
  useEffect(() => {
    if (slideCount <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slideCount);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [slideCount]);

  const goTo = (index: number) => {
    setCurrent((index + slideCount) % slideCount);
  };

  return (
    <section className="relative overflow-hidden bg-cream-light">
      <div className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        <div className="relative group">
          <div
            className="relative w-full overflow-hidden transition-[height] duration-500 ease-out"
            style={{ height: viewportHeight }}
          >
            <div
              className="flex items-start transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {slides.map((slide, i) => {
                if (slide.kind === 'research') {
                  return (
                    <a
                      key="research-slide"
                      ref={(el) => { slideRefs.current[i] = el; }}
                      href="/research"
                      className="group/slide shrink-0 flex flex-col items-center justify-center gap-4 sm:gap-5 px-6 py-10 sm:py-16 text-center bg-cream-light"
                      style={{ flex: '0 0 100%' }}
                      aria-label="Explore the peptide research library."
                    >
                      <span className="text-[10px] sm:text-[12px] font-semibold uppercase tracking-[0.28em] sm:tracking-[0.32em] text-gold-600">
                        The Research Library
                      </span>
                      <h2 className="font-heading text-[26px] sm:text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.12] text-navy-900 max-w-3xl">
                        The science behind
                        <br className="hidden sm:block" />{' '}
                        <em className="text-gold-600">every protocol.</em>
                      </h2>
                      <span className="h-0.5 w-12 sm:w-16 bg-gold-500" />
                      <p className="text-[13px] sm:text-base leading-relaxed text-charcoal-500 max-w-xs sm:max-w-md">
                        Evidence-based summaries of published clinical trials on peptides and GLP-1
                        therapies — peptide science, dosing, and head-to-head comparisons.
                      </p>
                      <span
                        className="mt-1 inline-flex items-center gap-3 bg-navy-900 px-7 py-3 sm:px-11 sm:py-4 text-[11px] sm:text-[13px] font-semibold uppercase tracking-[0.28em] text-cream-light transition-colors group-hover/slide:bg-gold-500 group-hover/slide:text-navy-900"
                        style={{ borderRadius: '2px' }}
                      >
                        Explore the Research Library
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.8} />
                      </span>
                    </a>
                  );
                }
                if (slide.kind === 'referral') {
                  return (
                    <div
                      key="referral-slide"
                      ref={(el) => { slideRefs.current[i] = el; }}
                      className="shrink-0 bg-cream-light"
                      style={{ flex: '0 0 100%' }}
                    >
                      <div className="mx-auto flex w-full max-w-6xl flex-col-reverse items-center gap-8 px-6 py-10 sm:py-14 md:flex-row md:items-center md:justify-between md:gap-12 md:px-12">
                        {/* Text column */}
                        <div className="w-full text-center md:w-1/2 md:text-left">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-600 sm:text-[12px] sm:tracking-[0.32em]">
                            Earn Monthly
                          </span>
                          <h2 className="mt-3 font-heading text-[30px] font-medium leading-[1.08] text-navy-900 sm:text-4xl md:text-5xl lg:text-[52px]">
                            Share Your
                            <br />{' '}
                            <em className="not-italic text-gold-600">Referral Code</em>
                          </h2>
                          <span className="mt-5 inline-block h-0.5 w-12 bg-gold-500 sm:w-16" />
                          <p className="mx-auto mt-5 max-w-sm text-[13px] leading-relaxed text-charcoal-500 sm:text-base md:mx-0">
                            Invite friends with your personal referral code and{' '}
                            <strong className="font-semibold text-navy-900">earn rewards</strong>{' '}
                            every month they shop.
                          </p>
                          <a
                            href="/user/profile"
                            className="group/cta mt-7 inline-flex items-center gap-4 bg-navy-900 px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-cream-light transition-colors hover:bg-gold-500 hover:text-navy-900 sm:text-[13px]"
                            style={{ borderRadius: '2px' }}
                          >
                            Share Your Code
                            <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" strokeWidth={1.8} />
                          </a>
                          <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-charcoal-500 sm:text-xs">
                            Don't have an account?{' '}
                            <a href="/user/profile" className="font-semibold text-gold-600 hover:text-gold-700">
                              Sign In
                            </a>{' '}
                            or{' '}
                            <a href="/user/profile" className="font-semibold text-gold-600 hover:text-gold-700">
                              Sign Up
                            </a>{' '}
                            now on our website
                          </p>
                        </div>

                        {/* Gift-box illustration */}
                        <div className="flex w-full items-center justify-center md:w-1/2" aria-hidden="true">
                          <ReferralGift />
                        </div>
                      </div>
                    </div>
                  );
                }
                if (slide.kind === 'assessment') {
                  return (
                    <a
                      key="assessment-slide"
                      ref={(el) => { slideRefs.current[i] = el; }}
                      href="/assessment"
                      className="group/slide shrink-0 flex flex-col items-center justify-center gap-4 sm:gap-5 px-6 py-10 sm:py-16 text-center bg-cream-light"
                      style={{ flex: '0 0 100%' }}
                      aria-label="Take the free peptide assessment to find your protocol."
                    >
                      <span className="text-[10px] sm:text-[12px] font-semibold uppercase tracking-[0.28em] sm:tracking-[0.32em] text-gold-600">
                        Personalized Recommendations
                      </span>
                      <h2 className="font-heading text-[26px] sm:text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.12] text-navy-900 max-w-3xl">
                        Which peptide protocol<br className="hidden sm:block" /> is right for you?
                      </h2>
                      <span className="h-0.5 w-12 sm:w-16 bg-gold-500" />
                      <p className="text-[13px] sm:text-base leading-relaxed text-charcoal-500 max-w-xs sm:max-w-md">
                        Answer a few screening and lifestyle questions and get a ranked protocol
                        matched to your goals — with a safety check before you begin.
                      </p>
                      <span
                        className="mt-1 inline-flex items-center gap-3 bg-navy-900 px-7 py-3 sm:px-11 sm:py-4 text-[11px] sm:text-[13px] font-semibold uppercase tracking-[0.28em] text-cream-light transition-colors group-hover/slide:bg-gold-500 group-hover/slide:text-navy-900"
                        style={{ borderRadius: '2px' }}
                      >
                        Begin Assessment
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.8} />
                      </span>
                    </a>
                  );
                }
                return (
                  <button
                    key={`${slide.src}-${i}`}
                    ref={(el) => { slideRefs.current[i] = el; }}
                    type="button"
                    onClick={onShopAll}
                    className="flex shrink-0 items-center justify-center cursor-pointer focus:outline-none bg-cream-light"
                    style={{ flex: '0 0 100%' }}
                    aria-label="PLP Slim 2.0 — Next level weight management support. Explore products."
                  >
                    <img
                      src={slide.src}
                      alt={`PLP Slim 2.0 — Next level weight management support. Slide ${i + 1}.`}
                      className="w-full h-auto"
                      width={1280}
                      height={720}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : 'auto'}
                      decoding="async"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {slideCount > 1 && (
            <>
              {/* Prev / Next arrows */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(current - 1); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-navy-900 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(current + 1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-navy-900 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={2} />
              </button>

              {/* Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {slides.map((slide, i) => (
                  <button
                    key={slide.kind === 'image' ? `dot-${slide.src}-${i}` : `dot-${slide.kind}`}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goTo(i); }}
                    className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-navy-900' : 'w-2 bg-white/70 hover:bg-white'}`}
                    aria-label={
                      slide.kind === 'assessment'
                        ? 'Go to the assessment slide'
                        : slide.kind === 'referral'
                          ? 'Go to the referral slide'
                          : slide.kind === 'research'
                            ? 'Go to the research slide'
                            : `Go to slide ${i + 1}`
                    }
                    aria-current={i === current}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="container mx-auto px-4 md:px-8 py-8 md:py-10">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <button
              onClick={onShopAll}
              className="group inline-flex items-center justify-between gap-6 px-7 py-4 bg-navy-900 text-white text-xs font-semibold tracking-[0.22em] uppercase hover:bg-navy-700 transition-all"
              style={{ borderRadius: '2px' }}
            >
              Explore Products
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
            </button>
            <a
              href="/protocols"
              className="group inline-flex items-center justify-between gap-6 px-7 py-4 bg-transparent text-navy-900 text-xs font-semibold tracking-[0.22em] uppercase border border-gold-500 hover:bg-gold-500 hover:text-white transition-all"
              style={{ borderRadius: '2px' }}
            >
              View Protocols
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
            </a>
            <a
              href="/assessment"
              className="group inline-flex items-center justify-between gap-6 px-7 py-4 bg-transparent text-navy-900 text-xs font-semibold tracking-[0.22em] uppercase border border-navy-900/25 hover:bg-navy-900 hover:text-white transition-all"
              style={{ borderRadius: '2px' }}
            >
              Take the Assessment
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.8} />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};

/**
 * Stylized navy gift box with a gold ribbon, bow, brand mark and reward coin —
 * a CSS/SVG recreation of the referral banner illustration (no raster asset).
 */
function ReferralGift() {
  return (
    <div className="relative flex h-[260px] w-[260px] items-center justify-center sm:h-[320px] sm:w-[320px]">
      {/* Soft circle backdrop */}
      <div className="absolute inset-4 rounded-full bg-navy-900/[0.06]" />

      {/* Decorative gold sprig */}
      <svg
        className="absolute right-2 top-2 h-28 w-28 text-gold-300 sm:h-32 sm:w-32"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M78 14C58 30 44 52 40 82" />
        <path d="M70 24c8-3 15-2 20 3-6 5-13 6-20 3M62 38c9-2 16 0 20 6-7 4-14 4-21 0M54 54c9-1 15 2 18 8-7 3-14 2-20-2M46 70c8 0 14 4 16 10-7 2-13 0-18-4" />
      </svg>

      {/* Gift box + lid */}
      <div className="relative">
        {/* Bow */}
        <div className="absolute -top-5 left-1/2 z-20 flex -translate-x-1/2 items-center">
          <span className="h-7 w-9 -rotate-12 rounded-[60%_40%_60%_40%] border border-gold-600/40 bg-gold-500 sm:h-8 sm:w-11" />
          <span className="z-10 -mx-1.5 h-5 w-5 rounded-full border border-gold-600/40 bg-gold-400" />
          <span className="h-7 w-9 rotate-12 rounded-[40%_60%_40%_60%] border border-gold-600/40 bg-gold-500 sm:h-8 sm:w-11" />
        </div>

        {/* Lid */}
        <div className="relative z-10 h-8 w-44 rounded-md bg-navy-800 shadow-md sm:h-9 sm:w-52">
          <span className="absolute left-1/2 top-0 h-full w-8 -translate-x-1/2 bg-gold-500/90 sm:w-9" />
        </div>

        {/* Box body */}
        <div className="relative -mt-1 h-40 w-40 rounded-b-md rounded-t-sm bg-navy-900 shadow-xl sm:h-48 sm:w-48">
          {/* Vertical ribbon */}
          <span className="absolute left-1/2 top-0 h-full w-8 -translate-x-1/2 bg-gold-500/90 sm:w-9" />
          {/* Brand mark */}
          <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-1">
            <Gift className="h-6 w-6 text-gold-400" strokeWidth={1.4} />
            <span className="font-heading text-[13px] tracking-[0.18em] text-gold-400 sm:text-sm">
              PEPTIDE
            </span>
            <span className="text-[7px] font-semibold uppercase tracking-[0.28em] text-gold-500/80">
              Lifestyle Program
            </span>
          </div>
        </div>

        {/* Reward coin */}
        <div className="absolute -bottom-4 -right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 shadow-lg ring-4 ring-gold-300 sm:h-[72px] sm:w-[72px]">
          <Gift className="h-7 w-7 text-navy-900" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}

export default Hero;
