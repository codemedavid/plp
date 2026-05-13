import React from 'react';
import { Download } from 'lucide-react';
import { downloadCSV, toCSV } from './csv';

interface Props<T extends Record<string, unknown>> {
  filename: string;
  rows: T[];
  label?: string;
}

function ExportButton<T extends Record<string, unknown>>({
  filename,
  rows,
  label = 'Export CSV',
}: Props<T>) {
  const handle = () => {
    if (rows.length === 0) return;
    downloadCSV(filename, toCSV(rows));
  };
  return (
    <button
      onClick={handle}
      disabled={rows.length === 0}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

export default ExportButton;
