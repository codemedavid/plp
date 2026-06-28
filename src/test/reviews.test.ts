import { describe, it, expect } from 'vitest';
import { extractProductIds, diffProductLinks } from '../lib/reviews';

// ─────────────────────────────────────────────────────
// Unit Tests: review ↔ product link helpers
// ─────────────────────────────────────────────────────

describe('extractProductIds', () => {
    it('returns product ids from the junction rows', () => {
        const row = {
            product_id: null,
            review_products: [{ product_id: 'p1' }, { product_id: 'p2' }],
        };

        expect(extractProductIds(row)).toEqual(['p1', 'p2']);
    });

    it('dedupes repeated junction product ids', () => {
        const row = {
            product_id: null,
            review_products: [{ product_id: 'p1' }, { product_id: 'p1' }, { product_id: 'p2' }],
        };

        expect(extractProductIds(row)).toEqual(['p1', 'p2']);
    });

    it('falls back to the legacy single product_id when no junction rows', () => {
        const row = { product_id: 'legacy', review_products: [] };

        expect(extractProductIds(row)).toEqual(['legacy']);
    });

    it('falls back to legacy product_id when review_products is missing', () => {
        const row = { product_id: 'legacy' };

        expect(extractProductIds(row)).toEqual(['legacy']);
    });

    it('returns an empty array when neither junction nor legacy id exist', () => {
        const row = { product_id: null, review_products: [] };

        expect(extractProductIds(row)).toEqual([]);
    });

    it('prefers junction rows over the legacy product_id', () => {
        const row = {
            product_id: 'legacy',
            review_products: [{ product_id: 'p1' }],
        };

        expect(extractProductIds(row)).toEqual(['p1']);
    });
});

describe('diffProductLinks', () => {
    it('detects products to add', () => {
        expect(diffProductLinks(['p1'], ['p1', 'p2'])).toEqual({
            toAdd: ['p2'],
            toRemove: [],
        });
    });

    it('detects products to remove', () => {
        expect(diffProductLinks(['p1', 'p2'], ['p1'])).toEqual({
            toAdd: [],
            toRemove: ['p2'],
        });
    });

    it('reports no changes when the sets are identical', () => {
        expect(diffProductLinks(['p1', 'p2'], ['p2', 'p1'])).toEqual({
            toAdd: [],
            toRemove: [],
        });
    });

    it('adds everything when current is empty', () => {
        expect(diffProductLinks([], ['p1', 'p2'])).toEqual({
            toAdd: ['p1', 'p2'],
            toRemove: [],
        });
    });

    it('removes everything when next is empty', () => {
        expect(diffProductLinks(['p1', 'p2'], [])).toEqual({
            toAdd: [],
            toRemove: ['p1', 'p2'],
        });
    });
});
