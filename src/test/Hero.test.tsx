import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    siteSettings: { hero_images: ['/hero-1.jpg'] },
    loading: false,
    error: null,
  }),
}));

import Hero from '../components/Hero';

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero onShopAll={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('Hero research slide', () => {
  it('includes a research slide linking to the research library', () => {
    renderHero();
    const link = screen.getByRole('link', { name: /research library/i });
    expect(link).toHaveAttribute('href', '/research');
  });

  it('shows the research pitch heading', () => {
    renderHero();
    expect(screen.getByText(/science behind/i)).toBeInTheDocument();
  });

  it('adds a slide dot for the research slide', () => {
    renderHero();
    expect(
      screen.getByRole('button', { name: /go to the research slide/i }),
    ).toBeInTheDocument();
  });
});

describe('Hero referral slide', () => {
  it('shows the referral pitch heading', () => {
    renderHero();
    expect(
      screen.getByRole('heading', { name: /share your referral code/i }),
    ).toBeInTheDocument();
  });

  it('links the share-your-code CTA to the user profile', () => {
    renderHero();
    const link = screen.getByRole('link', { name: /share your code/i });
    expect(link).toHaveAttribute('href', '/user/profile');
  });

  it('links sign in and sign up to the user profile', () => {
    renderHero();
    expect(screen.getByRole('link', { name: /^sign in$/i })).toHaveAttribute(
      'href',
      '/user/profile',
    );
    expect(screen.getByRole('link', { name: /^sign up$/i })).toHaveAttribute(
      'href',
      '/user/profile',
    );
  });

  it('adds a slide dot for the referral slide', () => {
    renderHero();
    expect(
      screen.getByRole('button', { name: /go to the referral slide/i }),
    ).toBeInTheDocument();
  });
});
