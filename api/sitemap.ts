import { createClient } from '@supabase/supabase-js';
import { slugify } from '../src/lib/slug.js';
import {
  buildSitemapXml,
  staticEntries,
  researchEntries,
  productEntries,
} from '../src/lib/sitemap.js';

// Dynamic sitemap: static routes + research articles + available products.
// If Supabase is unreachable, still serves the static + research portion so
// the sitemap is never empty.
export default async function handler(_req: any, res: any) {
  const entries = [...staticEntries(), ...researchEntries()];

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('products')
        .select('name, available')
        .eq('available', true);
      if (data) entries.push(...productEntries(data, slugify));
    }
  } catch (error: any) {
    console.error('sitemap: product fetch failed:', error?.message);
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res.status(200).send(buildSitemapXml(entries));
}
