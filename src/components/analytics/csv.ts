// Tiny CSV writer + browser download. RFC 4180-ish: quotes around cells that
// contain quote, comma, or newline; double internal quotes.

export function toCSV<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return '';
  const cols = (columns ?? (Object.keys(rows[0]) as (keyof T)[]));
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = cols.map(c => escape(String(c))).join(',');
  const body = rows.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
  return header + '\n' + body;
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
