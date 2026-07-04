import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResearchArticle from '../components/research/ResearchArticle';
import { ARTICLES } from '../data/researchArticles';

function renderArticle(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/research/${slug}`]}>
      <Routes>
        <Route path="/research/:slug" element={<ResearchArticle />} />
        <Route path="/research" element={<div>Research index</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const sample = ARTICLES[1]; // tirzepatide-faq

describe('ResearchArticle view', () => {
  it('renders the article title as an h1', () => {
    renderArticle(sample.slug);
    expect(
      screen.getByRole('heading', { level: 1, name: new RegExp(sample.title.slice(0, 15), 'i') }),
    ).toBeInTheDocument();
  });

  it('renders the on-this-page table of contents links', () => {
    renderArticle(sample.slug);
    const firstToc = sample.toc[0];
    const link = screen.getByRole('link', { name: firstToc.label });
    expect(link).toHaveAttribute('href', `#${firstToc.id}`);
  });

  it('renders the FAQ questions', () => {
    renderArticle(sample.slug);
    expect(screen.getByText(sample.faqs[0].q)).toBeInTheDocument();
  });

  it('toggles a FAQ answer open when its question is clicked', () => {
    renderArticle(sample.slug);
    const button = screen.getByRole('button', { name: new RegExp(sample.faqs[0].q.slice(0, 15), 'i') });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('lists the article sources', () => {
    renderArticle(sample.slug);
    expect(screen.getByText(sample.sources[0])).toBeInTheDocument();
  });

  it('renders the medical disclaimer', () => {
    renderArticle(sample.slug);
    expect(
      screen.getByText(/educational purposes only and is not medical advice/i),
    ).toBeInTheDocument();
  });

  it('redirects unknown slugs to the research index', () => {
    renderArticle('no-such-article');
    expect(screen.getByText('Research index')).toBeInTheDocument();
  });
});
