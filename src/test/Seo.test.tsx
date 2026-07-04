import { describe, it, expect, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import Seo from '../components/seo/Seo';
import { SITE_URL } from '../lib/seo';

function renderSeo(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

afterEach(() => {
  document.head.querySelectorAll('[data-rh]').forEach((n) => n.remove());
});

describe('Seo', () => {
  it('sets the document title', async () => {
    renderSeo(<Seo title="FAQ — PLP" path="/faq" />);
    await waitFor(() => expect(document.title).toContain('FAQ'));
  });

  it('sets the meta description and canonical link', async () => {
    renderSeo(<Seo title="FAQ" description="Answers to common questions" path="/faq" />);
    await waitFor(() => {
      const desc = document.head.querySelector('meta[name="description"]');
      expect(desc?.getAttribute('content')).toBe('Answers to common questions');
      const canonical = document.head.querySelector('link[rel="canonical"]');
      expect(canonical?.getAttribute('href')).toBe(`${SITE_URL}/faq`);
    });
  });

  it('emits Open Graph tags', async () => {
    renderSeo(<Seo title="FAQ" description="d" path="/faq" image="https://cdn/x.png" />);
    await waitFor(() => {
      const ogTitle = document.head.querySelector('meta[property="og:title"]');
      expect(ogTitle?.getAttribute('content')).toContain('FAQ');
      const ogImage = document.head.querySelector('meta[property="og:image"]');
      expect(ogImage?.getAttribute('content')).toBe('https://cdn/x.png');
    });
  });

  it('renders a JSON-LD script when structured data is provided', async () => {
    const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name: 'X' };
    renderSeo(<Seo title="X" path="/products/x" jsonLd={jsonLd} />);
    await waitFor(() => {
      const script = document.head.querySelector('script[type="application/ld+json"]');
      expect(script?.textContent).toContain('"Product"');
    });
  });

  it('marks pages noindex when requested', async () => {
    renderSeo(<Seo title="Profile" path="/user/profile" noindex />);
    await waitFor(() => {
      const robots = document.head.querySelector('meta[name="robots"]');
      expect(robots?.getAttribute('content')).toContain('noindex');
    });
  });
});
