import React from 'react';
import { useCategories } from '../hooks/useCategories';

interface MobileNavProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeCategory, onCategoryClick }) => {
  const { categories } = useCategories();

  return (
    <div className="sticky top-[65px] z-40 backdrop-blur-xl border-b border-brand-200 md:hidden" style={{ background: 'linear-gradient(135deg, rgba(255,240,245,0.95), rgba(255,250,252,0.95))' }}>
      <div className="flex overflow-x-auto scrollbar-hide px-4 py-3 gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryClick(category.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 font-cute ${activeCategory === category.id
                ? 'text-white shadow-glow'
                : 'bg-white text-charcoal-500 border border-brand-200 hover:bg-brand-50 hover:text-brand-600'
              }`}
            style={activeCategory === category.id ? { background: 'linear-gradient(135deg, #A8D5E5, #5FA8C8)' } : undefined}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
