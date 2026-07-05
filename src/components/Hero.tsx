import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

interface HeroProps {
  onShopAll: () => void;
}

const AUTO_ADVANCE_MS = 5000;

type HeroSlide =
  | { kind: 'image'; src: string }
  | { kind: 'assessment' };

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
  const slides: HeroSlide[] = showAssessmentSlide
    ? assessmentFirst
      ? [assessmentSlide, ...imageSlides]
      : [...imageSlides, assessmentSlide]
    : imageSlides;
  const slideCount = slides.length;

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
          <div className="relative w-full overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {slides.map((slide, i) => {
                if (slide.kind === 'assessment') {
                  return (
                    <a
                      key="assessment-slide"
                      href="/assessment"
                      className="group/slide shrink-0 flex flex-col items-center justify-center gap-4 sm:gap-5 px-6 py-10 text-center bg-cream-light aspect-[4/5] sm:aspect-[16/9]"
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
                    key={slide.kind === 'assessment' ? 'dot-assessment' : `dot-${slide.src}-${i}`}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goTo(i); }}
                    className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-navy-900' : 'w-2 bg-white/70 hover:bg-white'}`}
                    aria-label={slide.kind === 'assessment' ? 'Go to the assessment slide' : `Go to slide ${i + 1}`}
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

export default Hero;
