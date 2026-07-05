import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ResearchHero from '../components/research/ResearchHero';
import { getResearchHeroPosts } from '../components/research/researchHelpers';

function renderHero(props: Partial<{ onExploreResearch: () => void }> = {}) {
  return render(
    <MemoryRouter>
      <ResearchHero {...props} />
    </MemoryRouter>,
  );
}

describe('ResearchHero', () => {
  it('renders the science-library heading as the page h1', () => {
    renderHero();
    expect(
      screen.getByRole('heading', { level: 1, name: /science behind every protocol/i }),
    ).toBeInTheDocument();
  });

  it('no longer renders the removed research-library intro copy', () => {
    renderHero();
    expect(
      screen.queryByRole('heading', { name: /peptide research & education/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/evidence-based summaries of published clinical data/i)).toBeNull();
  });

  it('shows the three outcome stats', () => {
    renderHero();
    expect(screen.getByText('20.9%')).toBeInTheDocument();
    expect(screen.getByText('28.3%')).toBeInTheDocument();
    expect(screen.getByText('80+')).toBeInTheDocument();
  });

  it('lists the latest non-featured research guides with SPA links', () => {
    renderHero();
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    for (const post of getResearchHeroPosts()) {
      expect(hrefs).toContain(post.href);
    }
  });

  it('fires the explore-research callback from the CTA', async () => {
    const user = userEvent.setup();
    const onExploreResearch = vi.fn();
    renderHero({ onExploreResearch });
    await user.click(screen.getByRole('button', { name: /explore all research/i }));
    expect(onExploreResearch).toHaveBeenCalledTimes(1);
  });
});
