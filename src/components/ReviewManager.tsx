import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Star, Eye, EyeOff, ArrowLeft, MessageSquare, ShieldCheck } from 'lucide-react';
import { useReviewsAdmin, Review } from '../hooks/useReviews';
import { supabase } from '../lib/supabase';

interface ReviewManagerProps {
    onBack?: () => void;
}

interface ProductOption {
    id: string;
    name: string;
}

const emptyForm = {
    product_id: '',
    customer_name: '',
    rating: 5,
    title: '',
    comment: '',
    is_approved: true,
    is_verified_purchase: false,
    admin_posted: true,
};

const ReviewManager: React.FC<ReviewManagerProps> = ({ onBack }) => {
    const { reviews, loading, addReview, updateReview, deleteReview } = useReviewsAdmin();
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [error, setError] = useState<string | null>(null);
    const [filterProduct, setFilterProduct] = useState<string>('all');
    const [filterApproval, setFilterApproval] = useState<'all' | 'approved' | 'hidden'>('all');

    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from('products')
                .select('id, name')
                .order('name');
            setProducts((data || []) as ProductOption[]);
        })();
    }, []);

    const resetForm = () => {
        setFormData({ ...emptyForm });
        setEditingId(null);
        setIsEditing(false);
        setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.product_id) {
            setError('Please select a product.');
            return;
        }
        if (!formData.customer_name.trim()) {
            setError('Customer name is required.');
            return;
        }
        if (!formData.comment.trim()) {
            setError('Review comment is required.');
            return;
        }

        try {
            const payload = {
                product_id: formData.product_id,
                customer_name: formData.customer_name.trim(),
                rating: formData.rating,
                title: formData.title.trim() || null,
                comment: formData.comment.trim(),
                is_approved: formData.is_approved,
                is_verified_purchase: formData.is_verified_purchase,
                admin_posted: formData.admin_posted,
            };

            if (editingId) {
                await updateReview(editingId, payload);
            } else {
                await addReview(payload);
            }
            resetForm();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save review');
        }
    };

    const handleEdit = (r: Review) => {
        setFormData({
            product_id: r.product_id || '',
            customer_name: r.customer_name,
            rating: r.rating,
            title: r.title || '',
            comment: r.comment,
            is_approved: r.is_approved,
            is_verified_purchase: r.is_verified_purchase,
            admin_posted: r.admin_posted,
        });
        setEditingId(r.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this review?')) return;
        try {
            await deleteReview(id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        }
    };

    const toggleApproval = async (r: Review) => {
        try {
            await updateReview(r.id, { is_approved: !r.is_approved });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to toggle');
        }
    };

    const productName = (id: string | null) =>
        products.find(p => p.id === id)?.name || 'Unknown product';

    const filtered = reviews.filter(r => {
        if (filterProduct !== 'all' && r.product_id !== filterProduct) return false;
        if (filterApproval === 'approved' && !r.is_approved) return false;
        if (filterApproval === 'hidden' && r.is_approved) return false;
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-14">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
                            title="Go back"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </button>
                    )}
                    <MessageSquare className="w-6 h-6 text-charcoal-900" />
                    <h2 className="text-xl font-bold text-charcoal-900">Review Management</h2>
                </div>
                <button
                    onClick={() => { resetForm(); setIsEditing(true); }}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-brand-700 text-white px-4 py-2 rounded-lg hover:bg-brand-800 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Post Review
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Filter by product</label>
                    <select
                        value={filterProduct}
                        onChange={(e) => setFilterProduct(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    >
                        <option value="all">All products</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                        value={filterApproval}
                        onChange={(e) => setFilterApproval(e.target.value as 'all' | 'approved' | 'hidden')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    >
                        <option value="all">All</option>
                        <option value="approved">Approved (visible)</option>
                        <option value="hidden">Hidden</option>
                    </select>
                </div>
                <div className="text-sm text-gray-500 md:self-end md:pb-2">
                    {filtered.length} review{filtered.length === 1 ? '' : 's'}
                </div>
            </div>

            {/* Form */}
            {isEditing && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">
                            {editingId ? 'Edit review' : 'Post new review'}
                        </h3>
                        <button
                            type="button"
                            onClick={resetForm}
                            className="text-gray-500 hover:text-gray-900"
                            title="Cancel"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                                <select
                                    value={formData.product_id}
                                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                    required
                                >
                                    <option value="">Select a product</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer name *</label>
                                <input
                                    type="text"
                                    value={formData.customer_name}
                                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rating *</label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, rating: n })}
                                        className="p-1"
                                    >
                                        <Star
                                            className={`w-7 h-7 ${n <= formData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                        />
                                    </button>
                                ))}
                                <span className="ml-2 text-sm text-gray-600">{formData.rating} / 5</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                placeholder="Short summary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Comment *</label>
                            <textarea
                                value={formData.comment}
                                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                rows={5}
                                required
                            />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={formData.is_approved}
                                    onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                Approved (visible on site)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={formData.is_verified_purchase}
                                    onChange={(e) => setFormData({ ...formData, is_verified_purchase: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                Verified purchase
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={formData.admin_posted}
                                    onChange={(e) => setFormData({ ...formData, admin_posted: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                Admin posted
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="flex items-center gap-2 bg-brand-700 text-white px-4 py-2 rounded-lg hover:bg-brand-800 transition-colors shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                {editingId ? 'Update review' : 'Post review'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                        <p className="text-gray-500 text-lg">No reviews yet.</p>
                    </div>
                ) : (
                    filtered.map(r => (
                        <div
                            key={r.id}
                            className={`bg-white rounded-xl border shadow-sm p-5 ${r.is_approved ? 'border-gray-100' : 'border-red-200 bg-red-50/10'}`}
                        >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-xs uppercase tracking-wide text-gray-500">{productName(r.product_id)}</span>
                                        {r.is_verified_purchase && (
                                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                                <ShieldCheck className="w-3 h-3" /> Verified
                                            </span>
                                        )}
                                        {r.admin_posted && (
                                            <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                                                Admin
                                            </span>
                                        )}
                                        {!r.is_approved && (
                                            <span className="text-[10px] uppercase tracking-wide bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                                Hidden
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mb-2">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <Star
                                                key={n}
                                                className={`w-4 h-4 ${n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                            />
                                        ))}
                                        <span className="ml-2 text-sm font-medium text-gray-700">{r.customer_name}</span>
                                        <span className="text-xs text-gray-400 ml-2">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {r.title && (
                                        <h4 className="font-semibold text-gray-900 mb-1">{r.title}</h4>
                                    )}
                                    <p className="text-gray-700 whitespace-pre-line leading-relaxed text-sm">{r.comment}</p>
                                </div>
                                <div className="flex md:flex-col gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => toggleApproval(r)}
                                        className={`p-2 rounded-lg transition-colors ${r.is_approved ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                        title={r.is_approved ? 'Hide review' : 'Approve review'}
                                    >
                                        {r.is_approved ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(r)}
                                        className="p-2 text-charcoal-900 hover:bg-brand-50 rounded-lg transition-colors"
                                        title="Edit review"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(r.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete review"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ReviewManager;
