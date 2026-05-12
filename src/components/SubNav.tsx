import React from 'react';
import { useCategories } from '../hooks/useCategories';

interface SubNavProps {
    selectedCategory: string;
    onCategoryClick: (categoryId: string) => void;
}

const SubNav: React.FC<SubNavProps> = ({ selectedCategory, onCategoryClick }) => {
    const { categories, loading } = useCategories();

    if (loading) {
        return (
            <div className="backdrop-blur-xl border-b border-brand-100 hidden md:block" style={{ background: 'rgba(255,240,245,0.95)' }}>
                <div className="container mx-auto px-4 py-4">
                    <div className="flex space-x-3 overflow-x-auto">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="animate-pulse bg-brand-100 h-10 w-32 rounded-full" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <nav className="backdrop-blur-xl sticky top-[64px] md:top-[80px] lg:top-[88px] z-40 border-b border-brand-100 shadow-soft" style={{ background: 'rgba(255,240,245,0.95)' }}>
            <div className="container mx-auto px-2 sm:px-4">
                <div className="flex items-center space-x-1.5 sm:space-x-2 py-2 sm:py-4 overflow-x-auto scrollbar-hide">
                    {categories.map((category) => {
                        const isSelected = selectedCategory === category.id;

                        return (
                            <button
                                key={category.id}
                                onClick={() => onCategoryClick(category.id)}
                                className={`
                  flex items-center space-x-2 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full font-bold whitespace-nowrap
                  transition-all duration-300 text-[11px] sm:text-sm uppercase tracking-wider font-cute
                  ${isSelected
                                        ? 'text-white shadow-glow'
                                        : 'bg-white text-charcoal-500 hover:text-brand-600 hover:bg-brand-50 border border-brand-200'
                                    }
                `}
                                style={isSelected ? { background: 'linear-gradient(135deg, #A8D5E5, #5FA8C8)' } : undefined}
                            >
                                <span>{category.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </nav>
    );
};

export default SubNav;
