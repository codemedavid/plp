import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Review {
    id: string;
    product_id: string | null;
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

export type NewReview = Omit<Review, 'id' | 'created_at' | 'updated_at'>;

export const useReviews = (productId?: string) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('reviews')
                .select('*')
                .eq('is_approved', true)
                .order('created_at', { ascending: false });

            if (productId) {
                query = query.eq('product_id', productId);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                console.warn('Reviews fetch error:', fetchError.message);
                setReviews([]);
            } else {
                setReviews((data || []) as Review[]);
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
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) {
                setError(fetchError.message);
                setReviews([]);
            } else {
                setReviews((data || []) as Review[]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    const addReview = async (review: Partial<NewReview>) => {
        const { data, error: err } = await supabase
            .from('reviews')
            .insert([review])
            .select()
            .single();
        if (err) throw err;
        await fetchAll();
        return data;
    };

    const updateReview = async (id: string, updates: Partial<Review>) => {
        const { data, error: err } = await supabase
            .from('reviews')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (err) throw err;
        await fetchAll();
        return data;
    };

    const deleteReview = async (id: string) => {
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
    return data;
};

export const getReviewsForOrder = async (orderId: string) => {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('order_id', orderId);
    if (error) throw error;
    return (data || []) as Review[];
};
