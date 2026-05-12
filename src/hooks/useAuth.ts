import { useEffect, useState } from 'react';
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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, extras?: SignUpExtras) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, extras?: SignUpExtras) => {
    const referralCode = consumePendingReferralCode();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: extras?.fullName ?? null,
          phone: extras?.phone ?? null,
          referral_code_used: referralCode,
        },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user: session?.user ?? null,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
