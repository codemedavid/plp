import React, { useState } from 'react';
import { X, Star, Gift } from 'lucide-react';
import { submitCustomerReview, awardReviewPoints, REVIEW_REWARD_POINTS } from '../hooks/useReviews';

interface WriteReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    orderId: string;
    userId?: string | null;
    defaultName?: string;
    onSubmitted?: () => void;
}

const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
    isOpen,
    onClose,
    productId,
    productName,
    orderId,
    userId,
    defaultName,
    onSubmitted,
}) => {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [name, setName] = useState(defaultName || '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [pointsEarned, setPointsEarned] = useState(0);

    const isSignedIn = !!userId;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (!comment.trim()) {
            setError('Please write your review.');
            return;
        }

        setSubmitting(true);
        try {
            await submitCustomerReview({
                product_id: productId,
                user_id: userId || null,
                order_id: orderId,
                customer_name: name.trim(),
                rating,
                title: title.trim() || null,
                comment: comment.trim(),
                is_approved: true,
                is_verified_purchase: true,
                admin_posted: false,
            });
            // Credit review points for signed-in customers (best-effort — never
            // blocks the review). Guests earn nothing; we nudge them to sign in.
            const earned = isSignedIn ? await awardReviewPoints(orderId, productId) : 0;
            setPointsEarned(earned);
            setSuccess(true);
            onSubmitted?.();
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, earned > 0 ? 2600 : 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between p-6 border-b border-gray-100">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-gold-600 mb-1">Write a Review</p>
                        <h3 className="font-heading text-xl text-navy-900">{productName}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 p-1"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {success ? (
                    <div className="p-10 text-center">
                        {pointsEarned > 0 ? (
                            <>
                                <div className="w-14 h-14 mx-auto rounded-full bg-gold-50 flex items-center justify-center mb-4">
                                    <Gift className="w-7 h-7 text-gold-600" />
                                </div>
                                <h4 className="font-semibold text-gray-900 mb-1">
                                    You earned {pointsEarned} points!
                                </h4>
                                <p className="text-sm text-gray-600">
                                    That's ₱{pointsEarned} in rewards, added to your account. Thanks for your review!
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                                    <Star className="w-7 h-7 text-emerald-600 fill-emerald-600" />
                                </div>
                                <h4 className="font-semibold text-gray-900 mb-1">Thank you!</h4>
                                <p className="text-sm text-gray-600">
                                    {isSignedIn
                                        ? 'Your review has been submitted.'
                                        : `Your review has been submitted. Sign in next time to earn ${REVIEW_REWARD_POINTS} points per review.`}
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-gold-50 to-amber-50 border border-gold-200 px-4 py-3">
                            <div className="w-9 h-9 shrink-0 rounded-full bg-white flex items-center justify-center border border-gold-200">
                                <Gift className="w-4 h-4 text-gold-600" strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-navy-900 leading-tight">
                                    Earn {REVIEW_REWARD_POINTS} points (₱{REVIEW_REWARD_POINTS}) for your review
                                </p>
                                <p className="text-xs text-charcoal-500 leading-snug">
                                    {isSignedIn
                                        ? 'Credited to your account the moment you submit.'
                                        : `Sign in to your account to collect your ${REVIEW_REWARD_POINTS} points.`}
                                </p>
                            </div>
                        </div>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Your rating</label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onMouseEnter={() => setHoverRating(n)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(n)}
                                        className="p-1"
                                    >
                                        <Star
                                            className={`w-8 h-8 transition-colors ${n <= (hoverRating || rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                                }`}
                                        />
                                    </button>
                                ))}
                                <span className="ml-2 text-sm text-gray-600">{rating} / 5</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:border-transparent text-gray-900"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Summarize your experience"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:border-transparent text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your review *</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={5}
                                placeholder="What did you like or dislike about this product?"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:border-transparent text-gray-900"
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-navy-900 text-white px-4 py-3 rounded-lg hover:bg-navy-700 transition-colors font-semibold text-sm uppercase tracking-wider disabled:opacity-50"
                            >
                                {submitting ? 'Submitting…' : 'Submit Review'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm uppercase tracking-wider"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default WriteReviewModal;
