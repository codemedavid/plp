import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResearchBlog from '../components/research/ResearchBlog';
import { getFeaturedArticle, getOtherArticles } from '../components/research/researchHelpers';

function renderBlog() {
  return render(
    <MemoryRouter initialEntries={['/research']}>
      <ResearchBlog />
    </MemoryRouter>,
  );
}

describe('ResearchBlog index', () => {
  it('renders the library hero heading', () => {
    renderBlog();
    expect(
      screen.getByRole('heading', { level: 1, name: /peptide research/i }),
    ).toBeInTheDocument();
  });

  it('features the featured article with a link to it', () => {
    renderBlog();
    const featured = getFeaturedArticle()!;
    const link = screen.getByRole('link', { name: new RegExp(featured.title.slice(0, 20), 'i') });
    expect(link).toHaveAttribute('href', `/research/${featured.slug}`);
  });

  it('lists every non-featured article in the grid', () => {
    renderBlog();
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    for (const article of getOtherArticles()) {
      expect(hrefs).toContain(`/research/${article.slug}`);
    }
  });

  it('shows the article count for the latest research section', () => {
    renderBlog();
    const count = getOtherArticles().length;
    expect(screen.getByText(new RegExp(`${count} articles`, 'i'))).toBeInTheDocument();
  });

  it('renders a newsletter subscribe control', () => {
    renderBlog();
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
    expect(within(document.body).getByPlaceholderText(/email/i)).toBeInTheDocument();
  });
});
