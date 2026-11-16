import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    order_index: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FAQCategory {
    id: string;
    name: string;
    icon: string;
    order_index: number;
}

const defaultFAQs: FAQItem[] = [
    // Product & Usage
    {
        id: '1',
        question: 'Can I use Tirzepatide?',
        answer: 'Before purchasing, please check if Tirzepatide is suitable for you.\n✔️ View the checklist here — Contact us for more details.',
        category: 'PRODUCT & USAGE',
        order_index: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '2',
        question: 'Do you reconstitute (recon) Tirzepatide?',
        answer: 'Yes — for Metro Manila orders only.\nI provide free reconstitution when you purchase the complete set.\nI use pharma-grade bacteriostatic water, and I ship it with an ice pack + insulated pouch to maintain stability.',
        category: 'PRODUCT & USAGE',
        order_index: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '3',
        question: 'What size needles and cartridges do you offer?',
        answer: '• Needles: Compatible with all insulin-style pens (standard pen needle sizes).\n• Cartridges: Standard 3mL capacity.',
        category: 'PRODUCT & USAGE',
        order_index: 3,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '4',
        question: 'Can the pen pusher be retracted?',
        answer: '• Reusable pens: Yes, the pusher can be retracted.\n• Disposable pens: The pusher cannot be retracted and will stay forward once pushed.',
        category: 'PRODUCT & USAGE',
        order_index: 4,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '5',
        question: 'How should peptides be stored?',
        answer: 'Peptides must be stored in the refrigerator, especially once reconstituted.',
        category: 'PRODUCT & USAGE',
        order_index: 5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

export const useFAQs = () => {
    const [faqs, setFaqs] = useState<FAQItem[]>(defaultFAQs);
    const [loading, setLoading] = useState(true);
    const [error] = useState<string | null>(null);

    const fetchFAQs = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('faqs')
                .select('*')
                .eq('is_active', true)
                .order('order_index', { ascending: true });

            if (fetchError) {
                console.warn('FAQs table not found, using defaults:', fetchError.message);
                setFaqs(defaultFAQs);
            } else if (data && data.length > 0) {
                setFaqs(data);
            } else {
                setFaqs(defaultFAQs);
            }
        } catch (err) {
            console.error('Error fetching FAQs:', err);
            setFaqs(defaultFAQs);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFAQs();
    }, []);

    const categories = [...new Set(faqs.map(faq => faq.category))];

    return { faqs, categories, loading, error, refetch: fetchFAQs };
};

export const useFAQsAdmin = () => {
    const [faqs, setFaqs] = useState<FAQItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllFAQs = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('faqs')
                .select('*')
                .order('order_index', { ascending: true });

            if (fetchError) {
                console.warn('FAQs table not found:', fetchError.message);
                setFaqs([]);
            } else {
                setFaqs(data || []);
            }
        } catch (err) {
            console.error('Error fetching FAQs:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const addFAQ = async (faq: Omit<FAQItem, 'id' | 'created_at' | 'updated_at'>) => {
        const { data, error } = await supabase
            .from('faqs')
            .insert([faq])
            .select()
            .single();

        if (error) throw error;
        await fetchAllFAQs();
        return data;
    };

    const updateFAQ = async (id: string, updates: Partial<FAQItem>) => {
        const { data, error } = await supabase
            .from('faqs')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        await fetchAllFAQs();
        return data;
    };

    const deleteFAQ = async (id: string) => {
        const { error } = await supabase
            .from('faqs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await fetchAllFAQs();
    };

    useEffect(() => {
        fetchAllFAQs();
    }, []);

    return { faqs, loading, error, addFAQ, updateFAQ, deleteFAQ, refetch: fetchAllFAQs };
};
