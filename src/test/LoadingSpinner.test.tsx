import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner (branded loader)', () => {
  it('announces loading to assistive tech via a status region', () => {
    render(<LoadingSpinner />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/loading/i);
  });

  it('shows the Peptide Lifestyle Program logo', () => {
    render(<LoadingSpinner />);

    const logo = screen.getByAltText('Peptide Lifestyle Program');
    expect(logo).toHaveAttribute('src', '/logo-plp-loader.png');
    expect(logo).toHaveAttribute('width');
    expect(logo).toHaveAttribute('height');
  });

  it('reuses the same markup classes as the pre-JS splash in index.html', () => {
    const { container } = render(<LoadingSpinner />);

    expect(container.querySelector('.plp-loader')).not.toBeNull();
    expect(container.querySelector('.plp-loader__bar')).not.toBeNull();
  });
});
