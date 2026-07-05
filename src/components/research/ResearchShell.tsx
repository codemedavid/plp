import { Link } from 'react-router-dom';

// Branded header/footer for the research surface. Kept standalone (like
// ShippingReturns / ProtocolGuide) rather than reusing the app Header, which is
// coupled to cart/auth state. Nav links point at real app routes.

const NAV = [
  { label: 'PRODUCTS', to: '/#all-products' },
  { label: 'PROTOCOLS', to: '/protocols' },
  { label: 'RESEARCH', to: '/research' },
  { label: 'TRACK ORDER', to: '/track-order' },
];

export function ResearchHeader({ active = 'RESEARCH' }: { active?: string }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#FFFFFF',
        borderBottom: '1px solid #ECE4D3',
      }}
    >
      <div
        className="research-pad research-topbar"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '22px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'block', lineHeight: 1 }}>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '0.22em',
              color: '#B08D57',
            }}
          >
            PEPTIDE
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.34em',
              color: '#9A8355',
              marginTop: 5,
            }}
          >
            LIFESTYLE PROGRAM
          </div>
        </Link>
        <nav
          className="research-nav"
          aria-label="Research navigation"
          style={{ display: 'flex', gap: 40, alignItems: 'center' }}
        >
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: item.label === active ? '#B08D57' : '#17233E',
                textDecoration: 'none',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: 'flex', gap: 22, color: '#17233E' }}>
          <Link to="/user/profile" aria-label="Account" style={{ color: 'inherit' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
            </svg>
          </Link>
          <Link to="/#all-products" aria-label="Shop" style={{ color: 'inherit' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6h15l-1.5 9h-12z" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
              <path d="M6 6 5 3H2" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function ResearchFooter() {
  return (
    <footer style={{ background: '#17233E', padding: '48px 40px' }}>
      <div
        className="research-pad"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: '#C8A56A',
            }}
          >
            PEPTIDE
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.32em',
              color: '#8A94AC',
              marginTop: 4,
            }}
          >
            LIFESTYLE PROGRAM
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#8A94AC', margin: 0, maxWidth: '50ch' }}>
          Products sold for research use only. Educational content is not medical advice. © 2026
          Peptide Lifestyle Program.
        </p>
      </div>
    </footer>
  );
}
