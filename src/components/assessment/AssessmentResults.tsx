import type { AssessmentResult } from '../../lib/assessment';
import type { Product } from '../../types';
import { findProductBySlug, slugify } from '../../lib/slug';

type Props = {
  result: AssessmentResult;
  /** Live catalog, used to resolve each recommendation to a product page. */
  products: Product[];
  onRestart: () => void;
  onHome: () => void;
};

const CATALOG_FALLBACK = '/#all-products';

export function AssessmentResults({ result, products, onRestart, onHome }: Props) {
  const { cautions, recs } = result;
  const suitableWithCare = cautions.length > 0;

  return (
    <section aria-labelledby="results-heading" className="bg-cream-light">
      <div className="flex items-center justify-between border-b border-navy-900/10 bg-cream px-6 py-4">
        <span className="font-heading text-base tracking-[0.28em] text-gold-600">PEPTIDE</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-navy-900">Your Results</span>
        <button
          type="button"
          onClick={onHome}
          className="text-[12px] font-semibold uppercase tracking-[0.18em] text-charcoal-400 transition-colors hover:text-navy-900"
        >
          Close ✕
        </button>
      </div>

      <div className="container mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.32em] text-gold-600">Assessment Complete</p>
        <h1 id="results-heading" className="mt-4 font-heading text-4xl font-medium text-navy-900">
          Your personalized protocol
        </h1>
        <span
          className={`mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-2 text-[12px] font-bold uppercase tracking-[0.18em] ${
            suitableWithCare
              ? 'border-gold-500/60 bg-gold-50 text-gold-700'
              : 'border-green-700/30 bg-green-50 text-green-800'
          }`}
        >
          {suitableWithCare ? 'Suitable — with precautions' : 'Suitable for peptide support'}
        </span>
      </div>

      {cautions.length > 0 && (
        <div className="container mx-auto mb-9 max-w-3xl px-6">
          <div className="border border-gold-500/50 bg-gold-50 px-7 py-6" style={{ borderRadius: '2px' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold-700">Before you begin</p>
            <ul className="mt-3 space-y-2">
              {cautions.map((c) => (
                <li key={c} className="flex gap-2.5 text-sm leading-relaxed text-charcoal-600">
                  <span className="flex-none text-gold-600">◆</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="container mx-auto flex max-w-4xl flex-col gap-4 px-6 pb-6">
        {recs.map((r) => {
          const slug = slugify(r.name);
          const liveProduct = findProductBySlug(products, slug);
          const href = liveProduct ? `/products/${slug}` : CATALOG_FALLBACK;
          const isTop = r.rank === 1;
          return (
            <article
              key={r.id}
              className={`flex flex-col gap-6 bg-white p-7 sm:flex-row sm:items-center ${
                isTop ? 'border-2 border-gold-500' : 'border border-navy-900/10'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div
                className={`flex flex-none items-center justify-center rounded-full border border-gold-500/40 font-heading text-2xl ${
                  isTop ? 'bg-navy-900 text-gold-500' : 'bg-navy-900/5 text-navy-900'
                }`}
                style={{ height: '52px', width: '52px' }}
                aria-hidden
              >
                {r.rank}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-600">{r.tag}</p>
                <h2 className="mt-1 font-heading text-2xl font-medium text-navy-900">{r.name}</h2>
                <p className="text-sm text-charcoal-400">{r.sub}</p>
                <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-500">{r.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.why.map((w) => (
                    <span
                      key={w}
                      className="rounded-full bg-navy-900/5 px-3 py-1.5 text-[11px] font-semibold text-navy-900"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex-none text-left sm:text-right">
                <p className="font-heading text-3xl text-gold-600">
                  {r.match}
                  <span className="text-lg">%</span>
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-charcoal-400">Match</p>
                <p className="mt-2 text-[15px] font-semibold text-navy-900">from {r.price}</p>
                <a
                  href={href}
                  className="mt-3 inline-block bg-navy-900 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-gold-500 hover:text-navy-900"
                  style={{ borderRadius: '2px' }}
                >
                  View Product
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <div className="container mx-auto max-w-2xl px-6 pb-20 pt-4 text-center">
        <p className="text-[12.5px] leading-relaxed text-charcoal-400">
          These recommendations are informational and not medical advice. Products are intended for
          research and wellness support. Always consult a licensed physician before beginning any
          peptide protocol.
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 border border-navy-900/25 px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-700"
          style={{ borderRadius: '2px' }}
        >
          Retake Assessment
        </button>
      </div>
    </section>
  );
}

export default AssessmentResults;
