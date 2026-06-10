import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, ProductVariation } from '../types';

const REFETCH_DEBOUNCE_MS = 500;

export function useMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchIdRef = useRef(0);
  // Keep a ref to the latest products so async fallbacks can read fresh state
  // without taking it as a dependency / creating stale closures.
  const productsRef = useRef<Product[]>([]);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Schedules a debounced refetch; bursts of realtime/focus events collapse into one call.
  const scheduleFetch = (delay: number = REFETCH_DEBOUNCE_MS) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts();
      debounceRef.current = null;
    }, delay);
  };

  useEffect(() => {
    fetchProducts();

    // Set up real-time subscription for product changes with unique channel name
    const channelId = `products-realtime-${Date.now()}`;
    const productsChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          scheduleFetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_variations'
        },
        () => {
          scheduleFetch();
        }
      )
      .subscribe();

    // Refetch data when window regains focus (user switches back from admin)
    // But only if we're not on the admin page to avoid interfering with forms
    let focusRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleFocus = () => {
      // Check if we're on admin page - if so, don't refresh
      const isAdminPage = window.location.pathname === '/admin';
      if (isAdminPage) return;

      // Debounce focus refresh to avoid too frequent refreshes
      if (focusRefreshTimeout) {
        clearTimeout(focusRefreshTimeout);
      }

      focusRefreshTimeout = setTimeout(() => {
        scheduleFetch(0);
        focusRefreshTimeout = null;
      }, 1000); // Wait 1 second before refreshing
    };

    // Also add visibility change handler for better cross-tab updates
    // But skip if on admin page
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      const isAdminPage = window.location.pathname === '/admin';
      if (isAdminPage) return;

      // Debounce visibility refresh
      if (focusRefreshTimeout) {
        clearTimeout(focusRefreshTimeout);
      }

      focusRefreshTimeout = setTimeout(() => {
        scheduleFetch(0);
        focusRefreshTimeout = null;
      }, 1000);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(productsChannel);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (focusRefreshTimeout) {
        clearTimeout(focusRefreshTimeout);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProducts = async () => {
    const myFetchId = ++fetchIdRef.current;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category, base_price, discount_price, discount_start_date, discount_end_date, discount_active, purity_percentage, molecular_weight, cas_number, sequence, storage_conditions, inclusions, stock_quantity, available, featured, is_new, highlighted, image_url, safety_sheet_url, coa_url, sort_order, paired_product_ids, bundle_tiers, created_at, updated_at')
        .eq('available', true)
        .order('sort_order', { ascending: true })
        .order('featured', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      // Fetch variations for each product. Surface (and log) per-product variation errors
      // rather than silently swallowing them — keep previous variations when possible.
      // Use productsRef to avoid stale-closure bugs: the freshest products available
      // at variation-load time should be used as the fallback source.
      const previousById = new Map(productsRef.current.map((p) => [p.id, p.variations || []]));
      let variationErrorMessage: string | null = null;
      const productsWithVariations = await Promise.all(
        (data || []).map(async (product) => {
          const { data: variations, error: varErr } = await supabase
            .from('product_variations')
            .select('*')
            .eq('product_id', product.id)
            .order('quantity_mg', { ascending: true });

          if (varErr) {
            console.error(`Failed to load variations for ${product.name}:`, varErr);
            variationErrorMessage = varErr.message;
            return { ...product, variations: previousById.get(product.id) || [] };
          }

          return {
            ...product,
            variations: variations || []
          };
        })
      );

      // Drop result if a newer fetch started after this one began.
      if (myFetchId !== fetchIdRef.current) {
        return;
      }

      setProducts(productsWithVariations);
      setError(variationErrorMessage);
    } catch (err) {
      if (myFetchId !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      if (myFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Ensure image_url is explicitly included
      const productData: any = {
        ...product,
        image_url: product.image_url !== undefined ? product.image_url : null,
      };

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select('*, image_url') // Explicitly include image_url in response
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      if (data) {
        setProducts(prev => [...prev, data]);
      }
      return { success: true, data };
    } catch (err) {
      console.error('Error adding product:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add product' };
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      // Ensure image_url is explicitly included in the update payload
      // Handle both null, undefined, and empty string cases
      let imageUrlValue: string | null = null;
      if (updates.image_url !== undefined && updates.image_url !== null) {
        const urlString = String(updates.image_url).trim();
        imageUrlValue = urlString === '' ? null : urlString;
      }

      // Create update payload with explicit image_url
      const updatePayload: any = {
        ...updates,
        image_url: imageUrlValue, // Always explicitly set image_url
      };

      // Force image_url to be included even if it was somehow excluded
      updatePayload.image_url = imageUrlValue;

      // Explicitly select image_url to ensure it's returned
      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id)
        .select('*, image_url') // Explicitly include image_url in response
        .single();

      if (error) {
        console.error('Supabase update error:', error);

        // Provide more helpful error message
        let errorMessage = error.message || 'Unknown error';
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          errorMessage = 'Permission denied. Check Row Level Security (RLS) policies for the products table.';
        } else if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          errorMessage = 'Database column error. Make sure image_url column exists in products table.';
        }

        throw new Error(errorMessage);
      }

      if (data) {
        // Update local state immediately
        setProducts(prev => prev.map(p => p.id === id ? { ...data, variations: p.variations } : p));
      }
      return { success: true, data };
    } catch (err) {
      console.error('Error updating product:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product';
      return { success: false, error: errorMessage };
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting product:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete product' };
    }
  };

  const addVariation = async (variation: Omit<ProductVariation, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('product_variations')
        .insert([variation])
        .select()
        .single();

      if (error) throw error;

      // Refresh products to include new variation
      await fetchProducts();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding variation:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add variation' };
    }
  };

  const updateVariation = async (id: string, updates: Partial<ProductVariation>) => {
    try {
      const { data, error } = await supabase
        .from('product_variations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Refresh products to include updated variation
      await fetchProducts();
      return { success: true, data };
    } catch (err) {
      console.error('Error updating variation:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update variation' };
    }
  };

  const deleteVariation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_variations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh products to remove variation
      await fetchProducts();
      return { success: true };
    } catch (err) {
      console.error('Error deleting variation:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete variation' };
    }
  };

  return {
    menuItems: products, // Keep the same name for backward compatibility
    products,
    loading,
    error,
    refreshProducts: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    addVariation,
    updateVariation,
    deleteVariation
  };
}
