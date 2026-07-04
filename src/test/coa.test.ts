import { describe, it, expect } from 'vitest';
import { getCoaLinks, isSafeUrl } from '../lib/coa';

const PURITY = 'https://verify.janoshik.com/tests/113255-Tirzepatide_30mg_M6J942Z5BHLG';
const HEAVY = 'https://verify.janoshik.com/tests/113135-Tirzepatide_30mg_BES6MLPYQCK4';

describe('isSafeUrl', () => {
  it('accepts http and https', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('http://example.com')).toBe(true);
  });

  it('rejects javascript: and data: schemes', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>1</script>')).toBe(false);
  });

  it('rejects malformed or empty urls', () => {
    expect(isSafeUrl('not a url')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
  });
});

describe('getCoaLinks', () => {
  it('returns the coa_links list when present', () => {
    const links = getCoaLinks({
      coa_links: [
        { label: 'Purity Test', url: PURITY },
        { label: 'Heavy Metal Testing', url: HEAVY },
      ],
      coa_url: null,
    });

    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ label: 'Purity Test', url: PURITY });
    expect(links[1].label).toBe('Heavy Metal Testing');
  });

  it('falls back to legacy coa_url as a single labeled link', () => {
    const links = getCoaLinks({ coa_links: [], coa_url: PURITY });

    expect(links).toEqual([{ label: 'Certificate of Analysis', url: PURITY }]);
  });

  it('prefers coa_links over the legacy coa_url', () => {
    const links = getCoaLinks({
      coa_links: [{ label: 'Purity Test', url: PURITY }],
      coa_url: HEAVY,
    });

    expect(links).toHaveLength(1);
    expect(links[0].url).toBe(PURITY);
  });

  it('returns an empty array when nothing is set', () => {
    expect(getCoaLinks({ coa_links: [], coa_url: null })).toEqual([]);
  });

  it('tolerates a missing coa_links field (legacy cached rows)', () => {
    // Older cached products may not carry the coa_links column at all.
    expect(getCoaLinks({ coa_url: PURITY } as never)).toEqual([
      { label: 'Certificate of Analysis', url: PURITY },
    ]);
  });

  it('drops entries with empty labels or unsafe urls and trims the rest', () => {
    const links = getCoaLinks({
      coa_links: [
        { label: '', url: PURITY },
        { label: 'Bad', url: 'javascript:alert(1)' },
        { label: '  Purity Test  ', url: `  ${PURITY}  ` },
      ],
      coa_url: null,
    });

    expect(links).toEqual([{ label: 'Purity Test', url: PURITY }]);
  });
});
