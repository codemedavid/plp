import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="flex flex-col leading-tight">
                <span className="font-heading text-base font-normal tracking-[0.18em] text-gold-500 uppercase">
                  Peptide
                </span>
                <span className="text-[0.55rem] tracking-[0.28em] uppercase text-gold-500 -mt-0.5">
                  Lifestyle Program
                </span>
              </span>
            </div>
            <p className="text-navy-200 text-sm leading-relaxed font-light max-w-xs mb-6">
              Science-backed peptides for those who demand more from their wellness.
            </p>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-navy-700 pt-6">
          <p className="text-xs text-navy-300 text-center font-light">
            &copy; {currentYear} Peptide Lifestyle Program. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
