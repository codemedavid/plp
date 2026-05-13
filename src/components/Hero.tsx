import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onShopAll: () => void;
}

const Hero: React.FC<HeroProps> = ({ onShopAll }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative overflow-hidden bg-cream-light">
      <div className="container mx-auto px-4 md:px-8 py-20 md:py-28">
        <div className={`max-w-2xl transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          <h1 className="font-heading font-normal leading-[0.95] text-navy-900 mb-2">
            <span className="block text-6xl md:text-7xl lg:text-8xl tracking-tight">PEPTIDE</span>
            <span className="block text-xl md:text-2xl tracking-[0.32em] mt-4 text-navy-900 font-light">
              LIFESTYLE PROGRAM
            </span>
          </h1>

          <p className="text-base md:text-lg text-charcoal-500 mt-8 mb-10 leading-relaxed max-w-md font-light">
            More than fat loss — peptides designed to support performance, recovery, and long-term health.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
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
