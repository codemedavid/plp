import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toCSV, downloadCSV } from '../components/analytics/csv';

describe('toCSV', () => {
  it('returns empty string for empty rows', () => {
    expect(toCSV([])).toBe('');
  });

  it('renders simple rows with inferred columns', () => {
    const rows = [
      { a: 1, b: 'two' },
      { a: 3, b: 'four' },
    ];
    expect(toCSV(rows)).toBe('a,b\n1,two\n3,four');
  });

  it('uses provided columns and preserves order', () => {
    const rows = [{ a: 1, b: 2, c: 3 }];
    expect(toCSV(rows, ['c', 'a'])).toBe('c,a\n3,1');
  });

  it('quotes cells containing commas', () => {
    const rows = [{ name: 'Doe, John', age: 30 }];
    expect(toCSV(rows)).toBe('name,age\n"Doe, John",30');
  });

  it('quotes cells containing newlines', () => {
    const rows = [{ note: 'line1\nline2' }];
    expect(toCSV(rows)).toBe('note\n"line1\nline2"');
  });

  it('quotes cells containing carriage returns', () => {
    const rows = [{ note: 'a\rb' }];
    expect(toCSV(rows)).toBe('note\n"a\rb"');
  });

  it('escapes embedded quotes by doubling them', () => {
    const rows = [{ q: 'He said "hi"' }];
    expect(toCSV(rows)).toBe('q\n"He said ""hi"""');
  });

  it('renders null/undefined as empty', () => {
    const rows = [{ a: null as unknown as string, b: undefined as unknown as string, c: 'ok' }];
    expect(toCSV(rows)).toBe('a,b,c\n,,ok');
  });

  it('coerces non-string values', () => {
    const rows = [{ n: 42, b: true, s: 'x' }];
    expect(toCSV(rows)).toBe('n,b,s\n42,true,x');
  });
});

describe('downloadCSV', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and clicks an anchor with the filename', () => {
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    // @ts-expect-error stub
    URL.createObjectURL = createObjectURL;
    // @ts-expect-error stub
    URL.revokeObjectURL = revokeObjectURL;

    const clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'a') {
        (el as HTMLAnchorElement).click = clickSpy;
      }
      return el;
    });

    downloadCSV('data.csv', 'a,b\n1,2');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
