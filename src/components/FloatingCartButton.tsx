import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface FloatingCartButtonProps {
  itemCount: number;
  onCartClick: () => void;
}

const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({ itemCount, onCartClick }) => {
  if (itemCount === 0) return null;

  return (
    <button
      onClick={onCartClick}
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 lg:bottom-8 lg:right-8 text-white rounded-full shadow-luxury hover:shadow-xl transition-all duration-300 transform hover:scale-105 z-50 p-3 md:p-4 group bg-navy-900 hover:bg-navy-700"
      aria-label="View cart"
    >
      <div className="relative">
        <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
        <span className="absolute -top-2 -right-2 md:-top-3 md:-right-3 text-navy-900 text-[10px] md:text-xs font-bold rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center shadow-md bg-gold-500">
          {itemCount}
        </span>
      </div>
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap hidden md:block">
        <div className="bg-brand-700 text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 rounded-xl shadow-lg border border-brand-600 font-cute">
          {itemCount} item{itemCount !== 1 ? 's' : ''} in cart
          <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-brand-700 border-r border-b border-brand-600"></div>
        </div>
      </div>
    </button>
  );
};

export default FloatingCartButton;
