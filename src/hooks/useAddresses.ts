import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface UserAddress {
  id: string;
  user_id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  address: string;
  barangay: string;
  city: string;
  state: string;
  zip_code: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressInput {
  label?: string | null;
  recipient_name: string;
  phone: string;
  address: string;
  barangay: string;
  city: string;
  state: string;
  zip_code: string;
  is_primary?: boolean;
}

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });
    if (err) setError(err.message);
    else setAddresses((data as UserAddress[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAddress = useCallback(
    async (input: AddressInput): Promise<{ error: string | null; data: UserAddress | null }> => {
      if (!user) return { error: 'Not signed in', data: null };
      const makePrimary = input.is_primary ?? addresses.length === 0;
      const { data, error: err } = await supabase
        .from('user_addresses')
        .insert({ ...input, user_id: user.id, is_primary: makePrimary })
        .select()
        .single();
      if (err) return { error: err.message, data: null };
      await refresh();
      return { error: null, data: data as UserAddress };
    },
    [user, addresses.length, refresh]
  );

  const updateAddress = useCallback(
    async (id: string, input: Partial<AddressInput>): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not signed in' };
      const { error: err } = await supabase
        .from('user_addresses')
        .update(input)
        .eq('id', id)
        .eq('user_id', user.id);
      if (err) return { error: err.message };
      await refresh();
      return { error: null };
    },
    [user, refresh]
  );

  const deleteAddress = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not signed in' };
      const target = addresses.find(a => a.id === id);
      const { error: err } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (err) return { error: err.message };
      // If we removed the primary, promote the oldest remaining.
      if (target?.is_primary) {
        const remaining = addresses.filter(a => a.id !== id);
        if (remaining.length > 0) {
          await supabase
            .from('user_addresses')
            .update({ is_primary: true })
            .eq('id', remaining[0].id)
            .eq('user_id', user.id);
        }
      }
      await refresh();
      return { error: null };
    },
    [user, addresses, refresh]
  );

  const setPrimary = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not signed in' };
      const { error: err } = await supabase
        .from('user_addresses')
        .update({ is_primary: true })
        .eq('id', id)
        .eq('user_id', user.id);
      if (err) return { error: err.message };
      await refresh();
      return { error: null };
    },
    [user, refresh]
  );

  const primary = addresses.find(a => a.is_primary) ?? addresses[0] ?? null;

  return { addresses, primary, loading, error, refresh, addAddress, updateAddress, deleteAddress, setPrimary };
}
