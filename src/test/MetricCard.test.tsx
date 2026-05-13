import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import MetricCard from '../components/analytics/MetricCard';

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Revenue" value="₱1,000" />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('₱1,000')).toBeInTheDocument();
  });

  it('renders sub when provided', () => {
    render(<MetricCard label="Orders" value="42" sub="last 30d" />);
    expect(screen.getByText('last 30d')).toBeInTheDocument();
  });

  it('omits sub when not provided', () => {
    const { container } = render(<MetricCard label="Orders" value="42" />);
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
    expect(screen.queryByText('last 30d')).not.toBeInTheDocument();
  });

  it('applies good tone classes', () => {
    const { container } = render(<MetricCard label="x" value="y" tone="good" />);
    expect(container.firstChild).toHaveClass('bg-emerald-50');
  });

  it('applies bad tone classes', () => {
    const { container } = render(<MetricCard label="x" value="y" tone="bad" />);
    expect(container.firstChild).toHaveClass('bg-rose-50');
  });

  it('applies warn tone classes', () => {
    const { container } = render(<MetricCard label="x" value="y" tone="warn" />);
    expect(container.firstChild).toHaveClass('bg-amber-50');
  });

  it('defaults to default tone', () => {
    const { container } = render(<MetricCard label="x" value="y" />);
    expect(container.firstChild).toHaveClass('bg-white');
  });

  it('applies hero classes when hero is true', () => {
    const { container } = render(<MetricCard label="x" value="y" hero />);
    expect(container.firstChild).toHaveClass('col-span-2');
  });
});
