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
      <div className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        <button
          onClick={onShopAll}
          className="block w-full cursor-pointer focus:outline-none"
          aria-label="PLP Slim 2.0 — Next level weight management support. Explore products."
        >
          <img
            src="/hero-plp-slim.png"
            alt="PLP Slim 2.0 — Next level weight management support. 35mg combination formula: Tirzepatide 30mg + Cagrilintide 5mg."
            className="w-full h-auto"
          />
        </button>

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
