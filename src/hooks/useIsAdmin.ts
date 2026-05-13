import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (authLoading) return;
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('useIsAdmin: failed to load profile role', error);
        setIsAdmin(false);
      } else {
        setIsAdmin((data as { role?: string } | null)?.role === 'admin');
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin: isAdmin === true, loading: loading || authLoading };
}
