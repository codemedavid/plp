import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ARTICLES } from '../../data/researchArticles';
import { getFeaturedArticle, getOtherArticles } from './researchHelpers';
import { ResearchHeader, ResearchFooter } from './ResearchShell';
import ResearchHero from './ResearchHero';

const SITE_TITLE = 'Research Blog — Peptide Lifestyle Program';
const SITE_DESCRIPTION =
  'Evidence-based research and education on peptides, GLP-1 medications, dosing protocols, and weight-management science from the Peptide Lifestyle Program.';

// Card swatch treatments, cycled across the grid (matches the design).
const SWATCHES = [
  { bg: 'linear-gradient(150deg,#EDE4CF 0%,#E2D3AF 100%)', ink: '#17233E', badge: 'GLP-1' },
  { bg: 'linear-gradient(150deg,#1B2947 0%,#2C3D63 100%)', ink: '#C8A56A', badge: 'Tri' },
  { bg: 'linear-gradient(150deg,#E7DEC8 0%,#D8C7A0 100%)', ink: '#17233E', badge: 'vs' },
];

export default function ResearchBlog() {
  const featured = getFeaturedArticle();
  const rest = getOtherArticles();
  const latestRef = useRef<HTMLElement>(null);

  const scrollToLatest = () => {
    latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // SEO: restore the index title/description and publish the Blog JSON-LD.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = SITE_TITLE;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? null;
    metaDesc?.setAttribute('content', SITE_DESCRIPTION);

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Peptide Lifestyle Program Research Blog',
      blogPost: ARTICLES.map((a) => ({
        '@type': 'BlogPosting',
        headline: a.title,
        datePublished: a.date,
        articleSection: a.category,
        author: { '@type': 'Organization', name: 'PLP Research Team' },
      })),
    });
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      if (prevDesc !== null) metaDesc?.setAttribute('content', prevDesc);
      ld.remove();
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#F4F0E6', fontFamily: "'Mulish','Inter',sans-serif" }}>
      <ResearchHeader active="RESEARCH" />

      <main>
        {/* Hero carousel: library intro + the "science behind every protocol" slide */}
        <ResearchHero onExploreResearch={scrollToLatest} />

        {/* Featured */}
        {featured && (
          <section
            className="research-pad"
            style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 40px 24px' }}
          >
            <Link
              to={`/research/${featured.slug}`}
              className="research-featured"
              style={{
                textDecoration: 'none',
                display: 'grid',
                gridTemplateColumns: '1.05fr 1fr',
                background: '#FFFFFF',
                border: '1px solid #E7DDC7',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 24px 60px -34px rgba(23,35,62,0.35)',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(150deg,#1B2947 0%,#2C3D63 100%)',
                  padding: '56px 52px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 26,
                    right: 30,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    color: '#C8A56A',
                    border: '1px solid rgba(200,165,106,0.5)',
                    padding: '6px 12px',
                    borderRadius: 100,
                  }}
                >
                  FEATURED
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: '#C8A56A',
                    marginBottom: 20,
                  }}
                >
                  {featured.category}
                </div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 600,
                    fontSize: 40,
                    lineHeight: 1.12,
                    color: '#FBF8F1',
                    margin: '0 0 20px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {featured.title}
                </h2>
                <p style={{ fontSize: 16, lineHeight: 1.65, color: '#C3CADB', margin: '0 0 28px' }}>
                  {featured.dek}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: '#F4F0E6',
                    }}
                  >
                    READ THE GUIDE
                  </span>
                  <svg width="22" height="14" viewBox="0 0 24 14" fill="none" stroke="#C8A56A" strokeWidth="1.8">
                    <path d="M0 7h22M16 1l6 6-6 6" />
                  </svg>
                </div>
              </div>
              <div
                style={{
                  background: '#F4F0E6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 40,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: 340,
                    height: 340,
                    border: '1px solid #D8C9A0',
                    borderRadius: '50%',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    width: 250,
                    height: 250,
                    border: '1px solid #E3D6B7',
                    borderRadius: '50%',
                  }}
                />
                <div style={{ position: 'relative', textAlign: 'center' }}>
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#B08D57"
                    strokeWidth="1.3"
                    style={{ marginBottom: 18 }}
                  >
                    <path d="M7 7l3.5 3.5M17 17l-3.5-3.5" />
                    <rect x="13" y="2.5" width="8.5" height="8.5" rx="1.5" transform="rotate(45 17.25 6.75)" />
                    <path d="M9.5 12.5 4 18a2 2 0 1 0 2 2l5.5-5.5" />
                  </svg>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 30,
                      color: '#17233E',
                      fontWeight: 600,
                    }}
                  >
                    Peptide
                    <br />
                    Science 101
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#8A7A54',
                      marginTop: 12,
                      letterSpacing: '0.14em',
                      fontWeight: 600,
                    }}
                  >
                    {featured.readMins} MIN READ · {featured.dateLabel}
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Grid */}
        <section
          ref={latestRef}
          className="research-pad"
          style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px 40px', scrollMarginTop: 90 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 30,
              borderBottom: '1px solid #E1D6BE',
              paddingBottom: 18,
            }}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 600,
                fontSize: 28,
                color: '#17233E',
                margin: 0,
              }}
            >
              Latest Research
            </h2>
            <span style={{ fontSize: 13, letterSpacing: '0.14em', color: '#8A909E', fontWeight: 600 }}>
              {rest.length} ARTICLES
            </span>
          </div>
          <div
            className="research-index-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}
          >
            {rest.map((post, i) => {
              const swatch = SWATCHES[i % SWATCHES.length];
              return (
                <Link
                  key={post.slug}
                  to={`/research/${post.slug}`}
                  style={{
                    textDecoration: 'none',
                    background: '#FFFFFF',
                    border: '1px solid #E7DDC7',
                    borderRadius: 10,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      height: 150,
                      background: swatch.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        width: 170,
                        height: 170,
                        border: '1px solid rgba(184,141,87,0.35)',
                        borderRadius: '50%',
                        top: -40,
                        right: -40,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 26,
                        fontWeight: 600,
                        color: swatch.ink,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {swatch.badge}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '26px 26px 28px',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        letterSpacing: '0.16em',
                        color: '#B08D57',
                        marginBottom: 13,
                      }}
                    >
                      {post.category}
                    </div>
                    <h3
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 600,
                        fontSize: 22,
                        lineHeight: 1.22,
                        color: '#17233E',
                        margin: '0 0 12px',
                      }}
                    >
                      {post.title}
                    </h3>
                    <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5B6474', margin: '0 0 20px', flex: 1 }}>
                      {post.metaDescription}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid #EFE7D6',
                        paddingTop: 16,
                      }}
                    >
                      <span style={{ fontSize: 12, letterSpacing: '0.1em', color: '#8A909E', fontWeight: 600 }}>
                        {post.readMins} MIN READ
                      </span>
                      <svg width="20" height="12" viewBox="0 0 24 14" fill="none" stroke="#B08D57" strokeWidth="1.8">
                        <path d="M0 7h20M15 1l6 6-6 6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Newsletter */}
        <section
          className="research-pad"
          style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 40px 88px' }}
        >
          <div
            className="research-newsletter-card"
            style={{
              background: 'linear-gradient(150deg,#1B2947 0%,#2C3D63 100%)',
              borderRadius: 12,
              padding: '56px 60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 48,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: '52ch' }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  color: '#C8A56A',
                  marginBottom: 16,
                }}
              >
                STAY INFORMED
              </div>
              <h2
                className="research-newsletter-heading"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 600,
                  fontSize: 32,
                  lineHeight: 1.15,
                  color: '#FBF8F1',
                  margin: '0 0 12px',
                }}
              >
                New research, summarized monthly
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: '#C3CADB', margin: 0 }}>
                Trial results, dosing updates, and regulatory news, distilled into plain-English
                briefings.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="research-newsletter-form"
              style={{ display: 'flex', gap: 12, flex: 1, minWidth: 320 }}
            >
              <label
                htmlFor="research-newsletter"
                style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
              >
                Your email address
              </label>
              <input
                id="research-newsletter"
                type="email"
                placeholder="Your email address"
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  border: '1px solid rgba(200,165,106,0.4)',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 6,
                  color: '#F4F0E6',
                  fontFamily: "'Mulish','Inter',sans-serif",
                  fontSize: 15,
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '16px 30px',
                  background: '#B08D57',
                  color: '#17233E',
                  border: 'none',
                  borderRadius: 6,
                  fontFamily: "'Mulish','Inter',sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                SUBSCRIBE
              </button>
            </form>
          </div>
        </section>
      </main>

      <ResearchFooter />
    </div>
  );
}
