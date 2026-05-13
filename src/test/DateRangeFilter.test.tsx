import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DateRangeFilter from '../components/analytics/DateRangeFilter';

describe('DateRangeFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders preset buttons', () => {
    render(<DateRangeFilter range={{ from: '2026-04-01', to: '2026-05-01' }} onChange={vi.fn()} />);
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
    expect(screen.getByText('90d')).toBeInTheDocument();
    expect(screen.getByText('12m')).toBeInTheDocument();
  });

  it('renders current range in date inputs', () => {
    render(<DateRangeFilter range={{ from: '2026-04-01', to: '2026-05-01' }} onChange={vi.fn()} />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect((dateInputs[0] as HTMLInputElement).value).toBe('2026-04-01');
    expect((dateInputs[1] as HTMLInputElement).value).toBe('2026-05-01');
  });

  it('calls onChange with 7-day preset range', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter range={{ from: '2026-04-01', to: '2026-05-14' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('7d'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0];
    expect(arg.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(arg.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // from should be 7 days before to
    const diffMs = new Date(arg.to).getTime() - new Date(arg.from).getTime();
    expect(Math.round(diffMs / 86400000)).toBe(7);
  });

  it('calls onChange with 30-day preset range', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter range={{ from: '', to: '' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('30d'));
    const arg = onChange.mock.calls[0][0];
    const diffMs = new Date(arg.to).getTime() - new Date(arg.from).getTime();
    expect(Math.round(diffMs / 86400000)).toBe(30);
  });

  it('calls onChange when "from" date input changes', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter range={{ from: '2026-04-01', to: '2026-05-01' }} onChange={onChange} />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-03-15' } });
    expect(onChange).toHaveBeenCalledWith({ from: '2026-03-15', to: '2026-05-01' });
  });

  it('calls onChange when "to" date input changes', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter range={{ from: '2026-04-01', to: '2026-05-01' }} onChange={onChange} />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[1], { target: { value: '2026-05-10' } });
    expect(onChange).toHaveBeenCalledWith({ from: '2026-04-01', to: '2026-05-10' });
  });
});
