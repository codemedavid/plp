import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const downloadCSVMock = vi.fn();
const toCSVMock = vi.fn(() => 'a,b\n1,2');

vi.mock('../components/analytics/csv', () => ({
  downloadCSV: (...args: unknown[]) => downloadCSVMock(...args),
  toCSV: (...args: unknown[]) => toCSVMock(...args),
}));

import ExportButton from '../components/analytics/ExportButton';

describe('ExportButton', () => {
  beforeEach(() => {
    downloadCSVMock.mockClear();
    toCSVMock.mockClear();
  });

  it('renders default label', () => {
    render(<ExportButton filename="x.csv" rows={[{ a: 1 }]} />);
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<ExportButton filename="x.csv" rows={[{ a: 1 }]} label="Download" />);
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('is disabled when rows is empty', () => {
    render(<ExportButton filename="x.csv" rows={[]} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('does not download when rows is empty and clicked', () => {
    render(<ExportButton filename="x.csv" rows={[]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(downloadCSVMock).not.toHaveBeenCalled();
  });

  it('downloads CSV with filename when clicked', () => {
    const rows = [{ a: 1, b: 2 }];
    render(<ExportButton filename="report.csv" rows={rows} />);
    fireEvent.click(screen.getByRole('button'));
    expect(toCSVMock).toHaveBeenCalledWith(rows);
    expect(downloadCSVMock).toHaveBeenCalledWith('report.csv', 'a,b\n1,2');
  });
});
