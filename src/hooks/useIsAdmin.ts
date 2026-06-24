import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  // Depend on the stable user id string rather than the user object. On token
  // refresh / tab refocus Supabase hands back a new session (and a new user
  // object) for the same logged-in user — keying off the id avoids re-running
  // the role check and flipping `loading`, which would unmount admin screens
  // and wipe any in-progress form/modal state.
  const userId = user?.id ?? null;
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const resolvedForUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    // Already resolved for this exact user — nothing to do.
    if (resolvedForUserId.current === userId) return;

    let cancelled = false;
    async function load() {
      if (!userId) {
        resolvedForUserId.current = null;
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('useIsAdmin: failed to load profile role', error);
        setIsAdmin(false);
      } else {
        setIsAdmin((data as { role?: string } | null)?.role === 'admin');
      }
      resolvedForUserId.current = userId;
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  return { isAdmin: isAdmin === true, loading: loading || authLoading };
}
