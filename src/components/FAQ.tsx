import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Heart, ArrowLeft, HelpCircle } from 'lucide-react';
import Seo from './seo/Seo';
import { useFAQs } from '../hooks/useFAQs';

const categoryIcons: { [key: string]: React.ReactElement } = {
    'PRODUCT & USAGE': <Heart className="w-5 h-5" fill="currentColor" />,
};

const FAQ: React.FC = () => {
    const { faqs, categories, loading } = useFAQs();
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const toggleItem = (id: string) => {
        setOpenItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const filteredFAQs = activeCategory
        ? faqs.filter(faq => faq.category === activeCategory)
        : faqs;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #F5FAFD, #FFFFFF)' }}>
                <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen font-cute" style={{ background: 'linear-gradient(180deg, #F5FAFD, #FFFFFF)' }}>
            <Seo
                title="Peptide FAQ — Peptide Lifestyle Program"
                description="Answers to common questions about peptides, dosing, storage, shipping, and ordering from the Peptide Lifestyle Program."
                path="/faq"
            />
            {/* Header */}
            <div className="bg-white border-b-4 border-brand-500 sticky top-0 z-10 shadow-soft">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <a
                            href="/"
                            className="p-2 hover:bg-brand-50 rounded-2xl transition-colors group"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-brand-600" />
                        </a>
                        <div className="flex items-center gap-2">
                            <HelpCircle className="w-6 h-6 text-black" />
                            <h1 className="text-xl md:text-2xl font-bold font-cute text-charcoal-900">Frequently Asked Questions</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-8">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-6 py-2.5 rounded-full text-sm font-bold font-cute transition-all border shadow-soft ${activeCategory === null
                            ? 'bg-brand-500 text-white border-brand-500 shadow-md transform scale-105'
                            : 'bg-white text-charcoal-900 border-brand-200 hover:bg-brand-50'
                            }`}
                    >
                        All
                    </button>
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-4 py-2.5 rounded-full text-xs md:text-sm font-bold font-cute transition-all flex items-center gap-2 border shadow-soft ${activeCategory === category
                                ? 'bg-brand-500 text-white border-brand-500 shadow-md transform scale-105'
                                : 'bg-white text-charcoal-900 border-brand-200 hover:bg-brand-50 hover:text-charcoal-900'
                                }`}
                        >
                            <span className={activeCategory === category ? 'text-black' : 'text-black'}>
                                {categoryIcons[category]}
                            </span>
                            {category}
                        </button>
                    ))}
                </div>

                {/* FAQ Items by Category */}
                {(activeCategory ? [activeCategory] : categories).map(category => (
                    <div key={category} className="mb-10">
                        {/* Section Header */}
                        <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl border border-brand-200 bg-white shadow-soft w-full">
                            <span className="text-black">
                                {categoryIcons[category] || <HelpCircle className="w-5 h-5" />}
                            </span>
                            <h2 className="font-bold text-sm md:text-base uppercase tracking-wide text-black">{category}</h2>
                        </div>

                        <div className="space-y-4">
                            {filteredFAQs
                                .filter(faq => faq.category === category)
                                .map(faq => (
                                    <div
                                        key={faq.id}
                                        className="bg-white rounded-2xl border border-brand-200 shadow-soft hover:shadow-md transition-all duration-200"
                                    >
                                        <button
                                            onClick={() => toggleItem(faq.id)}
                                            className="w-full px-6 py-5 flex items-start justify-between text-left group gap-4"
                                        >
                                            <span className="font-bold text-black text-base md:text-lg group-hover:text-black transition-colors leading-snug">
                                                {faq.question}
                                            </span>
                                            {openItems.has(faq.id) ? (
                                                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-brand-500 flex-shrink-0 transition-colors mt-1" />
                                            )}
                                        </button>
                                        {openItems.has(faq.id) && (
                                            <div className="px-6 pb-6 pt-0">
                                                <div className="h-px w-full bg-gray-100 mb-4"></div>
                                                <p className="text-black whitespace-pre-line leading-relaxed text-base">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}

            </div>
        </div>
    );
};

export default FAQ;
