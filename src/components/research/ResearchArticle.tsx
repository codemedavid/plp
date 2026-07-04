import { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { AUTHOR } from '../../data/researchArticles';
import type { Article } from '../../data/researchArticles';
import { getArticleBySlug, getRelatedArticles, buildBody } from './researchHelpers';
import { ResearchHeader, ResearchFooter } from './ResearchShell';
import ProductSpotlight from './ProductSpotlight';
import { useMenu } from '../../hooks/useMenu';

const BASE_URL = 'https://peptidelifestyleprogram.com';

/** Scroll-driven reading-progress percentage, disabled under reduced motion. */
function useReadingProgress(): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

/** Inject/update the article's title, meta description, and JSON-LD graph. */
function useArticleSeo(article: Article) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${article.title} — Peptide Lifestyle Program`;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? null;
    metaDesc?.setAttribute('content', article.metaDescription);

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'MedicalWebPage',
          headline: article.title,
          description: article.metaDescription,
          url: `${BASE_URL}/research/${article.slug}`,
          datePublished: article.date,
          dateModified: article.date,
          keywords: article.keywords,
          author: { '@type': 'Organization', name: 'PLP Research Team' },
          publisher: { '@type': 'Organization', name: 'Peptide Lifestyle Program' },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Research', item: `${BASE_URL}/research` },
            { '@type': 'ListItem', position: 3, name: article.category },
            { '@type': 'ListItem', position: 4, name: article.title },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: article.faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        },
      ],
    });
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      if (prevDesc !== null) metaDesc?.setAttribute('content', prevDesc);
      ld.remove();
    };
  }, [article]);
}

export default function ResearchArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;

  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({});
  const progress = useReadingProgress();
  const { products } = useMenu();
  const spotlightProducts = products.filter((p) => p.available);

  // Hooks must run unconditionally; pass a safe fallback when the slug is bad.
  useArticleSeo(
    article ?? ({ title: '', metaDescription: '', faqs: [], toc: [] } as unknown as Article),
  );

  // Reset accordion + scroll to top on article change.
  useEffect(() => {
    setOpenFaq({});
    window.scrollTo(0, 0);
  }, [slug]);

  if (!article) return <Navigate to="/research" replace />;

  const related = getRelatedArticles(article);

  return (
    <div style={{ minHeight: '100vh', background: '#F4F0E6', fontFamily: "'Mulish','Inter',sans-serif" }}>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 3,
          background: '#B08D57',
          zIndex: 60,
          transition: 'width .1s linear',
          width: `${progress}%`,
        }}
      />
      <ResearchHeader active="RESEARCH" />

      <main className="research-fade">
        {/* Breadcrumb */}
        <div className="research-pad" style={{ maxWidth: 1200, margin: '0 auto', padding: '30px 40px 0' }}>
          <nav
            aria-label="Breadcrumb"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: '#8A909E',
            }}
          >
            <Link to="/" style={{ color: '#8A909E', textDecoration: 'none' }}>
              Home
            </Link>
            <span>/</span>
            <Link to="/research" style={{ color: '#8A909E', textDecoration: 'none' }}>
              Research
            </Link>
            <span>/</span>
            <span style={{ color: '#B08D57' }}>{article.category}</span>
          </nav>
        </div>

        {/* Header */}
        <header className="research-pad" style={{ maxWidth: 820, margin: '0 auto', padding: '40px 40px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', color: '#B08D57', marginBottom: 22 }}>
            {article.category.toUpperCase()}
          </div>
          <h1
            className="research-article-h1"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: 52,
              lineHeight: 1.08,
              color: '#17233E',
              margin: '0 0 26px',
              letterSpacing: '-0.015em',
            }}
          >
            {article.title}
          </h1>
          <p style={{ fontSize: 21, lineHeight: 1.6, color: '#5B6474', margin: '0 0 30px' }}>{article.dek}</p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '22px 0',
              borderTop: '1px solid #E1D6BE',
              borderBottom: '1px solid #E1D6BE',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: '#17233E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C8A56A',
                fontFamily: "'Playfair Display', serif",
                fontWeight: 600,
                fontSize: 18,
              }}
            >
              P
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#17233E' }}>{AUTHOR.name}</div>
              <div style={{ fontSize: 13, color: '#8A909E' }}>
                {article.dateLabel} · {article.readMins} min read
              </div>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: '#8A7A54',
                background: '#F0E9D8',
                padding: '8px 14px',
                borderRadius: 100,
              }}
            >
              Medically reviewed
            </span>
          </div>
        </header>

        {/* Body: TOC aside + content */}
        <div
          className="research-article-grid research-pad"
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '44px 40px 20px',
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 64,
            alignItems: 'start',
          }}
        >
          <aside className="research-article-aside" style={{ position: 'sticky', top: 104 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: '#B08D57', marginBottom: 18 }}>
              ON THIS PAGE
            </div>
            <nav
              aria-label="On this page"
              style={{ display: 'flex', flexDirection: 'column', gap: 2, borderLeft: '2px solid #E1D6BE' }}
            >
              {article.toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.4,
                    color: '#5B6474',
                    textDecoration: 'none',
                    padding: '8px 0 8px 18px',
                    marginLeft: -2,
                    borderLeft: '2px solid transparent',
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div style={{ marginTop: 32 }}>
              {spotlightProducts.length > 0 ? (
                <ProductSpotlight products={spotlightProducts} />
              ) : (
                <div style={{ padding: 22, background: '#17233E', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: '#C8A56A', marginBottom: 10 }}>
                    FEATURED PRODUCT
                  </div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 22,
                      color: '#FBF8F1',
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {article.productTie.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#A9B2C6', marginBottom: 16 }}>
                    {article.productTie.detail}
                  </div>
                  <Link
                    to="/#all-products"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      color: '#C8A56A',
                      textDecoration: 'none',
                    }}
                  >
                    VIEW PRODUCT
                    <svg width="16" height="10" viewBox="0 0 24 14" fill="none" stroke="#C8A56A" strokeWidth="2">
                      <path d="M0 7h18M13 1l6 6-6 6" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </aside>

          <article style={{ maxWidth: 720 }}>
            <div className="research-prose" dangerouslySetInnerHTML={{ __html: buildBody(article) }} />

            {/* FAQ */}
            <section id="faq" style={{ scrollMarginTop: 110, marginTop: 56, paddingTop: 12 }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 600,
                  fontSize: 34,
                  color: '#17233E',
                  margin: '0 0 24px',
                  letterSpacing: '-0.01em',
                }}
              >
                Frequently asked questions
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #E1D6BE' }}>
                {article.faqs.map((faq, i) => {
                  const isOpen = Boolean(openFaq[i]);
                  const panelId = `faq-panel-${i}`;
                  return (
                    <div key={faq.q} style={{ borderBottom: '1px solid #E1D6BE' }}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq((s) => ({ ...s, [i]: !s[i] }))}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 20,
                          padding: '22px 4px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: "'Mulish','Inter',sans-serif",
                        }}
                      >
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#17233E', lineHeight: 1.4 }}>
                          {faq.q}
                        </span>
                        <span
                          aria-hidden="true"
                          style={{
                            flexShrink: 0,
                            fontSize: 26,
                            color: '#B08D57',
                            lineHeight: 1,
                            fontWeight: 300,
                            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                            transition: 'transform .2s',
                          }}
                        >
                          +
                        </span>
                      </button>
                      <div
                        id={panelId}
                        role="region"
                        hidden={!isOpen}
                        style={{ maxHeight: isOpen ? 400 : 0, overflow: 'hidden', transition: 'max-height .3s ease' }}
                      >
                        <p style={{ fontSize: 16, lineHeight: 1.7, color: '#5B6474', margin: 0, padding: '0 4px 24px' }}>
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Sources */}
            <section
              style={{
                marginTop: 48,
                padding: '28px 32px',
                background: '#FBF8F1',
                border: '1px solid #E7DDC7',
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: '#B08D57', marginBottom: 16 }}>
                SOURCES &amp; FURTHER READING
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, color: '#5B6474', fontSize: 14.5, lineHeight: 1.7 }}>
                {article.sources.map((src) => (
                  <li key={src} style={{ marginBottom: 8 }}>
                    {src}
                  </li>
                ))}
              </ol>
            </section>

            {/* Author / E-E-A-T */}
            <section
              style={{
                marginTop: 32,
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
                padding: '28px 0',
                borderTop: '1px solid #E1D6BE',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: '#17233E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#C8A56A',
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 600,
                  fontSize: 22,
                }}
              >
                P
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#17233E' }}>{AUTHOR.name}</div>
                <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#B08D57', marginBottom: 8 }}>
                  {AUTHOR.role}
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#5B6474', margin: 0 }}>{AUTHOR.bio}</p>
              </div>
            </section>

            {/* Disclaimer */}
            <div style={{ marginTop: 16, padding: '18px 22px', borderLeft: '3px solid #B08D57', background: '#F0E9D8' }}>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#6B6244', margin: 0 }}>
                <strong style={{ color: '#5C5233' }}>Disclaimer:</strong> This content is for
                educational purposes only and is not medical advice. Peptide products are sold for
                research use only. Always consult a licensed physician before starting any protocol.
              </p>
            </div>
          </article>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="research-pad" style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 40px 88px' }}>
            <div style={{ borderTop: '1px solid #E1D6BE', paddingTop: 44 }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 600,
                  fontSize: 28,
                  color: '#17233E',
                  margin: '0 0 30px',
                }}
              >
                Continue reading
              </h2>
              <div
                className="research-index-grid"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}
              >
                {related.map((post) => (
                  <Link
                    key={post.slug}
                    to={`/research/${post.slug}`}
                    style={{
                      textDecoration: 'none',
                      background: '#FFFFFF',
                      border: '1px solid #E7DDC7',
                      borderRadius: 10,
                      padding: 28,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.16em', color: '#B08D57', marginBottom: 14 }}>
                      {post.category}
                    </div>
                    <h3
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 600,
                        fontSize: 21,
                        lineHeight: 1.22,
                        color: '#17233E',
                        margin: '0 0 18px',
                        flex: 1,
                      }}
                    >
                      {post.title}
                    </h3>
                    <span style={{ fontSize: 12, letterSpacing: '0.1em', color: '#8A909E', fontWeight: 600 }}>
                      {post.readMins} MIN READ
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <ResearchFooter />
    </div>
  );
}
