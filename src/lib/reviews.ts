// Helpers for the review ↔ product many-to-many relationship.
//
// A review links to its products through the `review_products` junction table.
// The legacy `reviews.product_id` column is kept for backward compatibility and
// is used as a fallback for rows created before the junction existed.

export interface ReviewProductLink {
    product_id: string;
}

export interface ReviewRowWithLinks {
    product_id?: string | null;
    review_products?: ReviewProductLink[] | null;
}

/**
 * Resolve the set of product ids a review is linked to.
 *
 * Prefers the junction rows; falls back to the legacy single `product_id`
 * column for older reviews that predate the junction table.
 */
export function extractProductIds(row: ReviewRowWithLinks): string[] {
    const fromJunction = (row.review_products ?? [])
        .map((link) => link.product_id)
        .filter((id): id is string => Boolean(id));

    if (fromJunction.length > 0) {
        return Array.from(new Set(fromJunction));
    }

    return row.product_id ? [row.product_id] : [];
}

export interface ProductLinkDiff {
    toAdd: string[];
    toRemove: string[];
}

/**
 * Compute which product links to add and remove when updating a review,
 * so the junction table can be reconciled with the smallest number of writes.
 */
export function diffProductLinks(current: string[], next: string[]): ProductLinkDiff {
    const currentSet = new Set(current);
    const nextSet = new Set(next);

    return {
        toAdd: next.filter((id) => !currentSet.has(id)),
        toRemove: current.filter((id) => !nextSet.has(id)),
    };
}
