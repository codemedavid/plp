import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Don't throw at import time — render a friendly error via ErrorBoundary instead.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars. ' +
      'The app will run in a degraded "not configured" mode until these are set.'
  );
}

// When env is missing, build a Proxy that returns sensible "not configured" errors
// from any method/chain. Real client otherwise.
function createStub(): SupabaseClient {
  const notConfigured = () => ({
    data: null,
    error: { message: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' },
  });
  const chainHandler: ProxyHandler<object> = {
    get: (_t, prop) => {
      if (prop === 'then') return undefined; // not a thenable
      // Methods that return a promise-like with { data, error }
      return (..._args: unknown[]) => new Proxy(() => notConfigured(), chainHandler) as never;
    },
    apply: () => Promise.resolve(notConfigured()),
  };
  const root: ProxyHandler<object> = {
    get: (_t, prop) => {
      if (prop === 'auth') {
        return new Proxy(function () {}, {
          get: () =>
            (..._args: unknown[]) =>
              Promise.resolve({ data: { session: null, user: null }, error: notConfigured().error }),
        });
      }
      if (prop === 'channel') {
        // Callers expect: supabase.channel(id).on(...).on(...).subscribe(...)
        // and the resulting subscription to be unsubscribable via removeChannel
        // OR a returned object's .unsubscribe(). Build a chainable stub where every
        // method returns the same chainable object, and a final subscription object
        // with no-op unsubscribe.
        const subscription = { unsubscribe: () => undefined };
        const chain: Record<string, (...args: unknown[]) => unknown> = {} as never;
        const buildChain = () => {
          chain.on = () => chain;
          chain.subscribe = () => subscription;
          chain.unsubscribe = () => undefined;
          return chain;
        };
        return () => buildChain();
      }
      if (prop === 'removeChannel') return () => undefined;
      if (prop === 'rpc') return (..._args: unknown[]) => Promise.resolve(notConfigured());
      return (..._args: unknown[]) => new Proxy(function () {}, chainHandler);
    },
  };
  return new Proxy(function () {}, root) as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : createStub();

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          icon: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: string;
          base_price: number;
          discount_price: number | null;
          discount_start_date: string | null;
          discount_end_date: string | null;
          discount_active: boolean;
          purity_percentage: number;
          molecular_weight: string | null;
          cas_number: string | null;
          sequence: string | null;
          storage_conditions: string;
          inclusions: string[] | null;
          description_font_family: string | null;
          description_font_size: string | null;
          inclusions_font_family: string | null;
          inclusions_font_size: string | null;
          stock_quantity: number;
          available: boolean;
          featured: boolean;
          image_url: string | null;
          safety_sheet_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          category: string;
          base_price: number;
          discount_price?: number | null;
          discount_start_date?: string | null;
          discount_end_date?: string | null;
          discount_active?: boolean;
          purity_percentage?: number;
          molecular_weight?: string | null;
          cas_number?: string | null;
          sequence?: string | null;
          storage_conditions?: string;
          inclusions?: string[] | null;
          description_font_family?: string | null;
          description_font_size?: string | null;
          inclusions_font_family?: string | null;
          inclusions_font_size?: string | null;
          stock_quantity?: number;
          available?: boolean;
          featured?: boolean;
          image_url?: string | null;
          safety_sheet_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          category?: string;
          base_price?: number;
          discount_price?: number | null;
          discount_start_date?: string | null;
          discount_end_date?: string | null;
          discount_active?: boolean;
          purity_percentage?: number;
          molecular_weight?: string | null;
          cas_number?: string | null;
          sequence?: string | null;
          storage_conditions?: string;
          inclusions?: string[] | null;
          description_font_family?: string | null;
          description_font_size?: string | null;
          inclusions_font_family?: string | null;
          inclusions_font_size?: string | null;
          stock_quantity?: number;
          available?: boolean;
          featured?: boolean;
          image_url?: string | null;
          safety_sheet_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_variations: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          quantity_mg: number;
          price: number;
          stock_quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          quantity_mg: number;
          price: number;
          stock_quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          quantity_mg?: number;
          price?: number;
          stock_quantity?: number;
          created_at?: string;
        };
      };
      payment_methods: {
        Row: {
          id: string;
          name: string;
          account_number: string;
          account_name: string;
          qr_code_url: string;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          account_number: string;
          account_name: string;
          qr_code_url: string;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          account_number?: string;
          account_name?: string;
          qr_code_url?: string;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      site_settings: {
        Row: {
          id: string;
          value: string;
          type: string;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          value: string;
          type?: string;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          value?: string;
          type?: string;
          description?: string | null;
          updated_at?: string;
        };
      };
    };
  };
};
