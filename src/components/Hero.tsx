import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

interface HeroProps {
  onShopAll: () => void;
}

const AUTO_ADVANCE_MS = 5000;

const Hero: React.FC<HeroProps> = ({ onShopAll }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { siteSettings } = useSiteSettings();
  const slides = (siteSettings?.hero_images && siteSettings.hero_images.length > 0)
    ? siteSettings.hero_images
    : ['/hero-plp-slim.jpg'];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Keep the active index valid if the number of slides changes.
  useEffect(() => {
    setCurrent((prev) => (prev >= slides.length ? 0 : prev));
  }, [slides.length]);

  // Auto-advance the carousel (skip when there's only one slide).
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goTo = (index: number) => {
    setCurrent((index + slides.length) % slides.length);
  };

  return (
    <section className="relative overflow-hidden bg-cream-light">
      <div className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        <div className="relative group">
          <button
            onClick={onShopAll}
            className="block w-full cursor-pointer focus:outline-none"
            aria-label="PLP Slim 2.0 — Next level weight management support. Explore products."
          >
            <div className="relative w-full overflow-hidden">
              <div
                className="flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
              >
                {slides.map((src, i) => (
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt={`PLP Slim 2.0 — Next level weight management support. Slide ${i + 1}.`}
                    className="w-full h-auto shrink-0"
                    style={{ flex: '0 0 100%' }}
                    width={1280}
                    height={720}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                    decoding="async"
                  />
                ))}
              </div>
            </div>
          </button>

          {slides.length > 1 && (
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
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goTo(i); }}
                    className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-navy-900' : 'w-2 bg-white/70 hover:bg-white'}`}
                    aria-label={`Go to slide ${i + 1}`}
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
          </div>
        </div>

      </div>
    </section>
  );
};

export default Hero;
