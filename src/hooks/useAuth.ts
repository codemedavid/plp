import { useEffect, useSyncExternalStore } from 'react';
import posthog from 'posthog-js';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { consumePendingReferralCode } from './useReferralCapture';

export interface SignUpExtras {
  fullName?: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, extras?: SignUpExtras) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  clearPasswordRecovery: () => void;
}

// Shared module-level store so every useAuth() consumer sees the same session
// and we only call getSession()/subscribe once across the app.
type Store = { session: Session | null; loading: boolean; passwordRecovery: boolean };
let store: Store = { session: null, loading: true, passwordRecovery: false };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(l => l());
const setStore = (next: Partial<Store>) => {
  store = { ...store, ...next };
  emit();
};

let initialized = false;
const ensureInit = () => {
  if (initialized) return;
  initialized = true;

  supabase.auth
    .getSession()
    .then(({ data }) => {
      if (data.session?.user) {
        posthog.identify(data.session.user.id, { email: data.session.user.email });
      }
      setStore({ session: data.session, loading: false });
    })
    .catch(() => {
      setStore({ loading: false });
    });

  supabase.auth.onAuthStateChange((event, newSession) => {
    if (
      newSession?.user &&
      (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')
    ) {
      posthog.identify(newSession.user.id, { email: newSession.user.email });
    }
    if (event === 'PASSWORD_RECOVERY') {
      setStore({ session: newSession, loading: false, passwordRecovery: true });
      return;
    }
    setStore({ session: newSession, loading: false });
  });
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const getSnapshot = () => store;

// Initialize eagerly on module load so session restoration starts before
// any component mounts — this prevents a logged-out flash on refresh.
if (typeof window !== 'undefined') {
  ensureInit();
}

export function useAuth(): AuthState {
  useEffect(() => {
    ensureInit();
  }, []);

  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      posthog.identify(data.user.id, { email });
    }
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, extras?: SignUpExtras) => {
    const referralCode = consumePendingReferralCode();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: extras?.fullName ?? null,
          phone: extras?.phone ?? null,
          referral_code_used: referralCode,
        },
      },
    });

    if (!error && data.user) {
      posthog.identify(data.user.id, {
        email,
        full_name: extras?.fullName ?? null,
        phone: extras?.phone ?? null,
      });
      posthog.capture('plp_welcome_user', {
        email,
        user_id: data.user.id,
        full_name: extras?.fullName ?? null,
        $set: { email, full_name: extras?.fullName ?? null },
      });
    }

    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    posthog.reset();
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setStore({ passwordRecovery: false });
    }
    return { error: error?.message ?? null };
  };

  const clearPasswordRecovery = () => {
    setStore({ passwordRecovery: false });
  };

  return {
    user: snap.session?.user ?? null,
    session: snap.session,
    loading: snap.loading,
    passwordRecovery: snap.passwordRecovery,
    signIn,
    signUp,
    signOut,
    updatePassword,
    clearPasswordRecovery,
  };
}
