import { Link } from 'react-router-dom';
import { getResearchHeroPosts } from './researchHelpers';

interface ResearchHeroProps {
  /** Scroll to the full research index below the hero. */
  onExploreResearch?: () => void;
}

// Outcome stats shown on the hero. Static editorial copy (from the approved
// "Research Hero" design), not derived from article data.
const STATS = [
  { value: '20.9%', label: 'TIRZEPATIDE', sub: 'Mean weight loss, 72 wks' },
  { value: '28.3%', label: 'RETATRUTIDE', sub: 'Mean weight loss, 80 wks' },
  { value: '80+', label: 'PEPTIDE DRUGS', sub: 'FDA-approved to date' },
];

const GOLD = '#B08D57';
const INK = '#17233E';

function Eyebrow({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
      <span style={{ width: 36, height: 1, background: GOLD }} />
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.24em', color: GOLD }}>
        {children}
      </span>
    </div>
  );
}

/** The "science behind every protocol" pitch + latest-research card. */
function HeroContent({ onExploreResearch }: { onExploreResearch?: () => void }) {
  const posts = getResearchHeroPosts();

  return (
    <div
      className="research-hero-slide"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(min(440px,100%),1fr))',
        gap: 'clamp(32px,5vw,64px)',
        alignItems: 'center',
      }}
    >
      {/* Left: message */}
      <div>
        <Eyebrow>THE RESEARCH LIBRARY</Eyebrow>
        <h1
          className="research-hero-h2"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 600,
            fontSize: 'clamp(38px,4.4vw,58px)',
            lineHeight: 1.06,
            color: INK,
            margin: '0 0 24px',
            letterSpacing: '-0.015em',
          }}
        >
          The science behind{' '}
          <em style={{ color: GOLD, fontWeight: 500 }}>every protocol.</em>
        </h1>
        <p
          style={{
            fontSize: 'clamp(16px,1.5vw,19px)',
            lineHeight: 1.7,
            color: '#5B6474',
            margin: '0 0 34px',
            maxWidth: '50ch',
          }}
        >
          Every protocol we discuss is grounded in published clinical trials. Explore our research
          library — peptide science, GLP-1 medications, dosing, and head-to-head comparisons.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onExploreResearch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: INK,
              color: '#F4F0E6',
              border: 'none',
              cursor: 'pointer',
              padding: '18px 34px',
              borderRadius: 6,
              fontFamily: "'Mulish','Inter',sans-serif",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.14em',
            }}
          >
            EXPLORE ALL RESEARCH
            <svg width="20" height="12" viewBox="0 0 24 14" fill="none" stroke="#C8A56A" strokeWidth="2">
              <path d="M0 7h20M15 1l6 6-6 6" />
            </svg>
          </button>
          <div style={{ fontSize: 13.5, color: '#8A7A54', fontWeight: 600, letterSpacing: '0.06em' }}>
            {posts.length} evidence-based guides · Medically reviewed
          </div>
        </div>

        {/* Data strip */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            marginTop: 'clamp(32px,4vw,48px)',
            borderTop: '1px solid #DED2B6',
            paddingTop: 26,
          }}
        >
          {STATS.map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                minWidth: 130,
                paddingRight: 22,
                borderRight: i < STATS.length - 1 ? '1px solid #DED2B6' : 'none',
                marginRight: i < STATS.length - 1 ? 22 : 0,
              }}
            >
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(28px,3vw,34px)',
                  fontWeight: 600,
                  color: INK,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.1em', color: GOLD, marginTop: 8 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 12.5, color: '#8A909E', marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: latest-research card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E7DDC7',
          borderRadius: 12,
          boxShadow: '0 34px 70px -40px rgba(23,35,62,0.45)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: INK,
            padding: '22px 30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', color: '#C8A56A' }}>
            LATEST RESEARCH
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: '#8A94AC' }}>
            UPDATED JULY 2026
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={post.href}
              className="research-hero-card-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '20px 26px',
                textDecoration: 'none',
                borderBottom: '1px solid #F0E9D8',
                background: '#FFFFFF',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: '#F4F0E6',
                  border: '1px solid #E3D6B7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 15,
                  fontWeight: 600,
                  color: GOLD,
                }}
              >
                {post.num}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: GOLD, marginBottom: 6 }}>
                  {post.categoryUpper}
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 18.5,
                    fontWeight: 600,
                    color: INK,
                    lineHeight: 1.25,
                  }}
                >
                  {post.title}
                </div>
                <div style={{ fontSize: 12.5, color: '#8A909E', marginTop: 6, fontWeight: 600, letterSpacing: '0.06em' }}>
                  {post.readMins} MIN READ
                </div>
              </div>
              <svg
                width="20"
                height="12"
                viewBox="0 0 24 14"
                fill="none"
                stroke={GOLD}
                strokeWidth="1.8"
                style={{ flexShrink: 0 }}
              >
                <path d="M0 7h20M15 1l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResearchHero({ onExploreResearch }: ResearchHeroProps) {
  return (
    <section
      aria-label="Research library highlights"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(120deg,#F7F3E9 0%,#F1EADA 55%,#EBE1CB 100%)',
      }}
    >
      {/* decorative gold rings */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 560,
          height: 560,
          border: '1px solid rgba(176,141,87,0.24)',
          borderRadius: '50%',
          top: -180,
          left: '46%',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 380,
          height: 380,
          border: '1px solid rgba(176,141,87,0.18)',
          borderRadius: '50%',
          bottom: -140,
          left: '38%',
          pointerEvents: 'none',
        }}
      />

      <div
        className="research-pad"
        style={{
          position: 'relative',
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'clamp(56px,7vw,88px) 40px clamp(72px,8vw,96px)',
        }}
      >
        <HeroContent onExploreResearch={onExploreResearch} />
      </div>
    </section>
  );
}
