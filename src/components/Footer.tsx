import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const columns = [
    {
      title: 'Shop',
      links: [
        { label: 'All Products', href: '#' },
        { label: 'Peptide Sets', href: '#' },
        { label: 'Best Sellers', href: '#' },
        { label: 'New Arrivals', href: '#' },
        { label: 'Accessories', href: '#' },
      ],
    },
    {
      title: 'Help',
      links: [
        { label: 'Shipping & Returns', href: '/shipping-returns' },
        { label: 'Track Order', href: '/track-order' },
        { label: 'Terms & Conditions', href: '/terms' },
        { label: 'Privacy Policy', href: '/privacy' },
      ],
    },
  ];

  return (
    <footer className="bg-navy-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-12">

          {/* Brand */}
          <div className="lg:col-span-1">
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

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-semibold tracking-[0.28em] uppercase text-white mb-5">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-navy-200 hover:text-gold-500 transition-colors font-light"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

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
