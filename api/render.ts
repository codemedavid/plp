import { createClient } from '@supabase/supabase-js';
import { ARTICLES } from '../src/data/researchArticles';
import { findProductBySlug } from '../src/lib/slug';
import { injectMeta, metaForArticle, metaForProduct, type PageMeta } from '../src/lib/renderMeta';

// Server-side social-preview shell. Rewrites (see vercel.json) send
// /products/* and /research/* here. We fetch the built index.html, inject the
// correct <head> meta for that URL, and return it. Non-JS scrapers get an
// accurate link preview; browsers hydrate React exactly as before.
export default async function handler(req: any, res: any) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const pathname = new URL(req.url, `${proto}://${host}`).pathname;

  // Static files bypass rewrites, so this returns the raw shell.
  let html = '';
  try {
    html = await fetch(`${proto}://${host}/index.html`).then((r) => r.text());
  } catch (error: any) {
    console.error('render: shell fetch failed:', error?.message);
  }

  let meta: PageMeta | null = null;
  const research = pathname.match(/^\/research\/([^/]+)\/?$/);
  const product = pathname.match(/^\/products\/([^/]+)\/?$/);

  if (research) {
    const article = ARTICLES.find((a) => a.slug === research[1]);
    if (article) meta = metaForArticle(article);
  } else if (product) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from('products')
          .select('name, description, image_url')
          .eq('available', true);
        const match = data ? findProductBySlug(data, product[1]) : undefined;
        if (match) meta = metaForProduct(match);
      }
    } catch (error: any) {
      console.error('render: product lookup failed:', error?.message);
    }
  }

  if (html && meta) html = injectMeta(html, meta);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache at the edge; scrapers and repeat visitors hit the cache, not Supabase.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
