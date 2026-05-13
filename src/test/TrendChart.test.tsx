import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import TrendChart from '../components/analytics/TrendChart';

describe('TrendChart', () => {
  it('renders an SVG element', () => {
    const { container } = render(
      <TrendChart labels={['Jan', 'Feb']} series={[{ label: 'A', color: '#f00', values: [1, 2] }]} />
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders legend entries for each series', () => {
    render(
      <TrendChart
        labels={['Jan', 'Feb']}
        series={[
          { label: 'Series A', color: '#f00', values: [1, 2] },
          { label: 'Series B', color: '#0f0', values: [3, 4] },
        ]}
      />
    );
    expect(screen.getByText('Series A')).toBeInTheDocument();
    expect(screen.getByText('Series B')).toBeInTheDocument();
  });

  it('renders one path per non-empty series', () => {
    const { container } = render(
      <TrendChart
        labels={['Jan', 'Feb']}
        series={[
          { label: 'A', color: '#f00', values: [1, 2] },
          { label: 'B', color: '#0f0', values: [3, 4] },
        ]}
      />
    );
    expect(container.querySelectorAll('path').length).toBe(2);
  });

  it('skips paths for empty value series', () => {
    const { container } = render(
      <TrendChart
        labels={['Jan']}
        series={[
          { label: 'A', color: '#f00', values: [1] },
          { label: 'Empty', color: '#0f0', values: [] },
        ]}
      />
    );
    expect(container.querySelectorAll('path').length).toBe(1);
  });

  it('renders a circle per data point', () => {
    const { container } = render(
      <TrendChart labels={['a', 'b', 'c']} series={[{ label: 'A', color: '#f00', values: [1, 2, 3] }]} />
    );
    expect(container.querySelectorAll('circle').length).toBe(3);
  });

  it('uses custom height when provided', () => {
    const { container } = render(
      <TrendChart labels={['a']} series={[{ label: 'A', color: '#f00', values: [1] }]} height={400} />
    );
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toContain('400');
  });
});
