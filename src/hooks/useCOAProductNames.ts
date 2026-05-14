import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

let cache: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

const loadCOAProductNames = async (): Promise<Set<string>> => {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase.from('coa_reports').select('product_name');
    if (error) {
      console.error('Error fetching COA product names:', error);
      return new Set<string>();
    }
    const set = new Set<string>((data ?? []).map((r) => normalize(r.product_name ?? '')).filter(Boolean));
    cache = set;
    return set;
  })();
  return inflight;
};

export const useCOAProductNames = () => {
  const [names, setNames] = useState<Set<string>>(cache ?? new Set());

  useEffect(() => {
    let mounted = true;
    loadCOAProductNames().then((set) => {
      if (mounted) setNames(set);
    });

    const channel = supabase
      .channel('coa-reports-product-names')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coa_reports' },
        () => {
          cache = null;
          inflight = null;
          loadCOAProductNames().then((set) => {
            if (mounted) setNames(set);
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const hasCOA = (productName: string) => names.has(normalize(productName));
  return { hasCOA, names };
};
