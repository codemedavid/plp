import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { extractProductIds, diffProductLinks } from '../lib/reviews';

export interface Review {
    id: string;
    product_id: string | null;
    product_ids: string[];
    user_id: string | null;
    order_id: string | null;
    customer_name: string;
    rating: number;
    title: string | null;
    comment: string;
    image_urls: string[] | null;
    is_approved: boolean;
    is_verified_purchase: boolean;
    admin_posted: boolean;
    created_at: string;
    updated_at: string;
}

export type NewReview = Omit<Review, 'id' | 'product_ids' | 'created_at' | 'updated_at'>;

// `select('*, review_products(product_id)')` returns the junction rows nested on
// each review. Map them into a flat product_ids array and drop the nested key so
// the result matches the Review shape.
const mapReviewRow = (row: Record<string, unknown>): Review => {
    const { review_products: _reviewProducts, ...rest } = row as Review & {
        review_products?: { product_id: string }[] | null;
    };
    return { ...(rest as Review), product_ids: extractProductIds(row) };
};

const REVIEW_WITH_PRODUCTS = '*, review_products(product_id)';

// Replace a review's product links with the given set, using the smallest
// number of writes. The legacy product_id column is kept in sync (first id).
const syncReviewProducts = async (reviewId: string, productIds: string[]) => {
    const { data: existing, error: fetchErr } = await supabase
        .from('review_products')
        .select('product_id')
        .eq('review_id', reviewId);
    if (fetchErr) throw fetchErr;

    const current = (existing || []).map((r) => r.product_id as string);
    const { toAdd, toRemove } = diffProductLinks(current, productIds);

    if (toRemove.length > 0) {
        const { error: delErr } = await supabase
            .from('review_products')
            .delete()
            .eq('review_id', reviewId)
            .in('product_id', toRemove);
        if (delErr) throw delErr;
    }

    if (toAdd.length > 0) {
        const { error: insErr } = await supabase
            .from('review_products')
            .insert(toAdd.map((product_id) => ({ review_id: reviewId, product_id })));
        if (insErr) throw insErr;
    }
};

export const useReviews = (productId?: string) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true);
            // !inner restricts to reviews that have a junction row for this product.
            let query = supabase
                .from('reviews')
                .select(productId ? '*, review_products!inner(product_id)' : REVIEW_WITH_PRODUCTS)
                .eq('is_approved', true)
                .order('created_at', { ascending: false });

            if (productId) {
                query = query.eq('review_products.product_id', productId);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                console.warn('Reviews fetch error:', fetchError.message);
                setReviews([]);
            } else {
                setReviews((data || []).map((row) => mapReviewRow(row as Record<string, unknown>)));
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const averageRating = reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return { reviews, loading, error, averageRating, refetch: fetchReviews };
};

export const useReviewsAdmin = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('reviews')
                .select(REVIEW_WITH_PRODUCTS)
                .order('created_at', { ascending: false });

            if (fetchError) {
                setError(fetchError.message);
                setReviews([]);
            } else {
                setReviews((data || []).map((row) => mapReviewRow(row as Record<string, unknown>)));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Create one review row linked to every selected product via the junction.
    const addReview = async (review: Partial<NewReview>, productIds: string[]) => {
        const payload = { ...review, product_id: productIds[0] ?? null };
        const { data, error: err } = await supabase
            .from('reviews')
            .insert([payload])
            .select()
            .single();
        if (err) throw err;

        if (productIds.length > 0) {
            await syncReviewProducts(data.id, productIds);
        }
        await fetchAll();
        return data;
    };

    // When productIds is provided the product links are reconciled; otherwise
    // only the review fields are updated (e.g. toggling approval).
    const updateReview = async (
        id: string,
        updates: Partial<Review>,
        productIds?: string[],
    ) => {
        const { product_ids: _ignored, ...rest } = updates;
        const reviewUpdates: Record<string, unknown> = {
            ...rest,
            updated_at: new Date().toISOString(),
        };
        if (productIds) {
            reviewUpdates.product_id = productIds[0] ?? null;
        }

        const { data, error: err } = await supabase
            .from('reviews')
            .update(reviewUpdates)
            .eq('id', id)
            .select()
            .single();
        if (err) throw err;

        if (productIds) {
            await syncReviewProducts(id, productIds);
        }
        await fetchAll();
        return data;
    };

    const deleteReview = async (id: string) => {
        // review_products rows cascade-delete with the review.
        const { error: err } = await supabase
            .from('reviews')
            .delete()
            .eq('id', id);
        if (err) throw err;
        await fetchAll();
    };

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return { reviews, loading, error, addReview, updateReview, deleteReview, refetch: fetchAll };
};

export const submitCustomerReview = async (review: Partial<NewReview>) => {
    const { data, error } = await supabase
        .from('reviews')
        .insert([review])
        .select()
        .single();
    if (error) throw error;

    // Customer reviews target a single product; mirror it into the junction.
    if (review.product_id) {
        const { error: linkError } = await supabase
            .from('review_products')
            .insert([{ review_id: data.id, product_id: review.product_id }]);
        if (linkError) throw linkError;
    }
    return data;
};

// Points a customer earns for reviewing a purchased product. Kept in sync with
// the award_review_points() DB function, which is the source of truth.
export const REVIEW_REWARD_POINTS = 50;

// Best-effort reward. The DB function validates the verified purchase and credits
// at most once per (user, order, product); it returns the points actually granted
// (0 if already claimed or not eligible). A failure here must never block the
// review itself, so we swallow errors and treat them as "no points this time".
export const awardReviewPoints = async (
    orderId: string,
    productId: string,
): Promise<number> => {
    const { data, error } = await supabase.rpc('award_review_points', {
        p_order_id: orderId,
        p_product_id: productId,
    });
    if (error) return 0;
    return typeof data === 'number' ? data : 0;
};

export const getReviewsForOrder = async (orderId: string) => {
    const { data, error } = await supabase
        .from('reviews')
        .select(REVIEW_WITH_PRODUCTS)
        .eq('order_id', orderId);
    if (error) throw error;
    return (data || []).map((row) => mapReviewRow(row as Record<string, unknown>));
};
