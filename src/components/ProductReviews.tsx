import React from 'react';
import { Star, ShieldCheck, MessageSquare } from 'lucide-react';
import { useReviews } from '../hooks/useReviews';

interface ProductReviewsProps {
    productId: string;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId }) => {
    const { reviews, loading, averageRating } = useReviews(productId);

    if (loading) {
        return (
            <div className="mt-6 py-4 text-sm text-charcoal-500">Loading reviews…</div>
        );
    }

    return (
        <div className="mt-6 border-t border-charcoal-100 pt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-charcoal-700" />
                    Customer Reviews
                </h3>
                {reviews.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(n => (
                                <Star
                                    key={n}
                                    className={`w-4 h-4 ${n <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-charcoal-200'}`}
                                />
                            ))}
                        </div>
                        <span className="text-sm font-semibold text-charcoal-900">
                            {averageRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-charcoal-500">
                            ({reviews.length} review{reviews.length === 1 ? '' : 's'})
                        </span>
                    </div>
                )}
            </div>

            {reviews.length === 0 ? (
                <p className="text-sm text-charcoal-500 py-3">
                    No reviews yet. Be the first to share your experience after your purchase.
                </p>
            ) : (
                <div className="space-y-4">
                    {reviews.slice(0, 6).map(r => (
                        <div key={r.id} className="border border-charcoal-100 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <Star
                                            key={n}
                                            className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-charcoal-200'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-semibold text-charcoal-900">{r.customer_name}</span>
                                {r.is_verified_purchase && (
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                        <ShieldCheck className="w-3 h-3" /> Verified
                                    </span>
                                )}
                                <span className="text-xs text-charcoal-400 ml-auto">
                                    {new Date(r.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            {r.title && (
                                <h4 className="font-semibold text-charcoal-900 text-sm mb-1">{r.title}</h4>
                            )}
                            <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-line">{r.comment}</p>
                        </div>
                    ))}
                    {reviews.length > 6 && (
                        <p className="text-xs text-charcoal-500 text-center">
                            Showing 6 of {reviews.length} reviews
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductReviews;
