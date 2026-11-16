// ─────────────────────────────────────────────────────
// Parity vectors between the storefront pricing (bundlePricing.ts,
// orderTotals.ts, paymentFee.ts, Checkout shipping rule) and the
// server-side repricing in place_order()
// (supabase/migrations/20261118000300_place_order_server_pricing.sql).
//
// Each vector's `sql` block holds the numbers the SQL produced for the same
// inputs, captured from rolled-back transactions on the live DB on
// 2026-11-17. serverPricingParity.test.ts asserts the TS functions still
// produce those numbers, so a change to the client pricing rules fails here
// until place_order() is updated to match (and the vectors re-captured).
//
// Products whose id starts with 00000000- are synthetic rows inserted only
// inside the rolled-back test transaction. The rest are live products, with
// their prices as of 2026-11-17.
// ─────────────────────────────────────────────────────

import type { BundleTier, KitType, Product, ProductVariation } from '../../types';
import { getEffectiveUnitPrice, qualifiesForFreeShipping } from '../../lib/bundlePricing';
import { computeCheckoutTotals, computePromoDiscount, type PromoTerms } from '../../lib/orderTotals';

export interface CatalogVariation {
    id: string;
    name: string;
    price: number;
    discount_price: number | null;
    discount_active: boolean;
}

export interface CatalogProduct {
    id: string;
    name: string;
    base_price: number;
    discount_price: number | null;
    discount_active: boolean;
    available: boolean;
    bundle_tiers: BundleTier[];
    variations: CatalogVariation[];
    /** true = row exists in the live DB; false = inserted in the test transaction only. */
    live: boolean;
}

const synthId = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const PARITY_CATALOG: Record<string, CatalogProduct> = {
    SLIM15: {
        id: '2848a7b5-72c9-435d-b9cd-31323345ae32', name: 'PLP-Slim (Tirzepatide 15mg)',
        base_price: 3999, discount_price: 2399, discount_active: true, available: true,
        bundle_tiers: [], variations: [], live: true,
    },
    SLIM30: {
        id: '6675536a-143d-4487-b49d-9d266b121f12', name: 'PLP-Slim Tirzepatide 30mg',
        base_price: 4999, discount_price: 2999, discount_active: true, available: true,
        bundle_tiers: [], variations: [], live: true,
    },
    NAD: {
        id: '6694e074-c889-4305-b2ee-67812fc48bb7', name: 'PLP - Youth ( Nad+ 500mg )',
        base_price: 3499, discount_price: 1749, discount_active: true, available: true,
        bundle_tiers: [], variations: [], live: true,
    },
    SLIMGLOW: {
        id: 'a4538fd1-411e-4e6e-8681-37fa7381699a', name: 'PLP Slim & Glow Bundle',
        base_price: 7499, discount_price: 4499, discount_active: true, available: true,
        bundle_tiers: [], variations: [], live: true,
    },
    PLAIN: {
        id: synthId(1), name: 'Parity Plain', base_price: 4999, discount_price: null, discount_active: false,
        available: true, bundle_tiers: [], variations: [], live: false,
    },
    SALE_OFF: {
        id: synthId(2), name: 'Parity Sale Off', base_price: 4999, discount_price: 2999, discount_active: false,
        available: true, bundle_tiers: [], variations: [], live: false,
    },
    TIERS: {
        id: synthId(3), name: 'Parity Tiers', base_price: 3000, discount_price: 2500, discount_active: true,
        available: true,
        bundle_tiers: [
            { qty: 1, label: '1 BOTTLE', price: null },
            { qty: 2, label: '2 BOTTLES', popular: true, price: 4500 },
            { qty: 3, label: '3 BOTTLES', price: 6000 },
            { qty: 4, label: '4 BOTTLES', price: 0 },
        ],
        variations: [], live: false,
    },
    VARIANTS: {
        id: synthId(4), name: 'Parity Variants', base_price: 5000, discount_price: 4000, discount_active: true,
        available: true,
        bundle_tiers: [{ qty: 3, label: '3 BOTTLES', price: 9999 }],
        variations: [
            { id: synthId(41), name: '10mg sale', price: 3500, discount_price: 2800, discount_active: true },
            { id: synthId(42), name: '10mg sale off', price: 3500, discount_price: 2800, discount_active: false },
            { id: synthId(43), name: '5mg centavos', price: 1999.99, discount_price: null, discount_active: false },
        ],
        live: false,
    },
    UNAVAILABLE: {
        id: synthId(5), name: 'Parity Unavailable', base_price: 1000, discount_price: null, discount_active: false,
        available: false, bundle_tiers: [], variations: [], live: false,
    },
};

export const PARITY_PROMOS: Record<string, PromoTerms & { code: string; min_purchase_amount: number; live: boolean }> = {
    SAVEBIG: { code: 'SAVEBIG', discount_type: 'fixed', discount_value: 4500, max_discount_amount: null, min_purchase_amount: 11000, live: true },
    PARITYPCT: { code: 'PARITYPCT', discount_type: 'percentage', discount_value: 10, max_discount_amount: 500, min_purchase_amount: 0, live: false },
    PARITYPCT2: { code: 'PARITYPCT2', discount_type: 'percentage', discount_value: 12.5, max_discount_amount: null, min_purchase_amount: 0, live: false },
};

/** Live shipping_locations (2026-11-17). */
export const PARITY_LOCATIONS: Record<string, number> = { JNT_METRO_MANILA: 200, JNT_PROVINCIAL: 200 };

/** Live payment_methods surcharge (2026-11-17). */
export const PARITY_PAYMENT_METHODS = {
    MAYA: { id: 'aee00b51-b02f-4c0e-a592-a6f61810c2ad', surchargePct: 0 },
    QRPH: { id: 'cf7d9d8e-0004-45bb-b19b-31403e5a493e', surchargePct: 3 },
} as const;

export const OFF_PROMO_NOW = '2026-11-17T12:00:00+08:00';
export const DURING_88_NOW = '2026-08-09T12:00:00+08:00';
export const AT_88_END_NOW = '2026-08-10T00:00:00+08:00';
export const AT_88_START_NOW = '2026-08-07T00:00:00+08:00';

// ───────────────────────────── builders

export function toProduct(p: CatalogProduct): Product {
    return {
        id: p.id, name: p.name, description: '', category: 'peptides',
        base_price: p.base_price, cost: 0, discount_price: p.discount_price,
        discount_start_date: null, discount_end_date: null, discount_active: p.discount_active,
        description_font_family: null, description_font_size: null,
        inclusions_font_family: null, inclusions_font_size: null,
        coa_links: [], purity_percentage: 99, molecular_weight: null, cas_number: null, sequence: null,
        storage_conditions: '', inclusions: null, stock_quantity: 100, available: p.available,
        featured: false, is_new: false, highlighted: false, image_url: null, safety_sheet_url: null,
        coa_url: null, paired_product_ids: [], bundle_tiers: p.bundle_tiers,
        created_at: '2026-01-01', updated_at: '2026-01-01',
    };
}

export function toVariation(p: CatalogProduct, v: CatalogVariation): ProductVariation {
    return {
        id: v.id, product_id: p.id, name: v.name, quantity_mg: 0, price: v.price, cost: null,
        discount_price: v.discount_price, discount_active: v.discount_active, stock_quantity: 100,
        created_at: '2026-01-01',
    };
}

const roundCentavos = (value: number): number => Math.round(value * 100) / 100;

// ───────────────────────────── line vectors (compute_unit_price, any `now`)

export interface LineVector {
    name: string;
    product: keyof typeof PARITY_CATALOG;
    variation?: number; // index into the product's variations
    kit: KitType;
    qty: number;
    now: string;
    /** round(compute_unit_price(...) * qty, 2) from the SQL run. */
    sqlLineTotal: number;
}

export function tsLineTotal(v: LineVector): number {
    const cat = PARITY_CATALOG[v.product];
    const variation = v.variation === undefined ? undefined : toVariation(cat, cat.variations[v.variation]);
    const unit = getEffectiveUnitPrice(toProduct(cat), variation, v.kit, v.qty, new Date(v.now));
    return roundCentavos(unit * v.qty);
}

export const LINE_VECTORS: LineVector[] = [
    { name: 'plain product, qty 1', product: 'PLAIN', kit: 'vial_only', qty: 1, now: OFF_PROMO_NOW, sqlLineTotal: 4999 },
    { name: 'active sale price, qty 1', product: 'SLIM30', kit: 'vial_only', qty: 1, now: OFF_PROMO_NOW, sqlLineTotal: 2999 },
    { name: 'inactive sale price, qty 1', product: 'SALE_OFF', kit: 'vial_only', qty: 1, now: OFF_PROMO_NOW, sqlLineTotal: 4999 },
    { name: 'active sale, qty 2 (10%)', product: 'SLIM30', kit: 'vial_only', qty: 2, now: OFF_PROMO_NOW, sqlLineTotal: 5398.2 },
    { name: 'active sale, qty 3 (15%)', product: 'NAD', kit: 'vial_only', qty: 3, now: OFF_PROMO_NOW, sqlLineTotal: 4459.95 },
    { name: 'active sale, qty 5 (15%)', product: 'SLIM30', kit: 'vial_only', qty: 5, now: OFF_PROMO_NOW, sqlLineTotal: 12745.75 },
    { name: 'inactive sale, qty 2 (10% of list)', product: 'SALE_OFF', kit: 'vial_only', qty: 2, now: OFF_PROMO_NOW, sqlLineTotal: 8998.2 },
    { name: 'variation with own sale', product: 'VARIANTS', variation: 0, kit: 'vial_only', qty: 1, now: OFF_PROMO_NOW, sqlLineTotal: 2800 },
    { name: 'variation, sale off (parent sale ignored)', product: 'VARIANTS', variation: 1, kit: 'vial_only', qty: 1, now: OFF_PROMO_NOW, sqlLineTotal: 3500 },
    { name: 'variation, qty 2 (10%)', product: 'VARIANTS', variation: 1, kit: 'vial_only', qty: 2, now: OFF_PROMO_NOW, sqlLineTotal: 6300 },
    { name: 'variation, qty 3 hits product tier', product: 'VARIANTS', variation: 1, kit: 'vial_only', qty: 3, now: OFF_PROMO_NOW, sqlLineTotal: 9999 },
    { name: 'bundle tier match qty 2', product: 'TIERS', kit: 'vial_only', qty: 2, now: OFF_PROMO_NOW, sqlLineTotal: 4500 },
    { name: 'bundle tier match qty 3', product: 'TIERS', kit: 'vial_only', qty: 3, now: OFF_PROMO_NOW, sqlLineTotal: 6000 },
    { name: 'tier price null (qty 1) -> regular', product: 'TIERS', kit: 'vial_only', qty: 1, now: OFF_PROMO_NOW, sqlLineTotal: 2500 },
    { name: 'tier price 0 (qty 4) -> auto 15%', product: 'TIERS', kit: 'vial_only', qty: 4, now: OFF_PROMO_NOW, sqlLineTotal: 8500 },
    { name: 'no tier for qty 5 -> auto 15%', product: 'TIERS', kit: 'vial_only', qty: 5, now: OFF_PROMO_NOW, sqlLineTotal: 10625 },
    { name: 'complete_kit qty 1', product: 'SLIM30', kit: 'complete_kit', qty: 1, now: OFF_PROMO_NOW, sqlLineTotal: 3149 },
    { name: 'complete_kit qty 2 (kit undiscounted)', product: 'SLIM30', kit: 'complete_kit', qty: 2, now: OFF_PROMO_NOW, sqlLineTotal: 5698.2 },
    { name: 'complete_kit + tier qty 3', product: 'TIERS', kit: 'complete_kit', qty: 3, now: OFF_PROMO_NOW, sqlLineTotal: 6450 },
    { name: 'centavo price, complete_kit qty 2', product: 'VARIANTS', variation: 2, kit: 'complete_kit', qty: 2, now: OFF_PROMO_NOW, sqlLineTotal: 3899.98 },
    { name: 'centavo price qty 5 (sub-centavo rounding)', product: 'VARIANTS', variation: 2, kit: 'vial_only', qty: 5, now: OFF_PROMO_NOW, sqlLineTotal: 8499.96 },
    { name: '8.8 promo, no sale -> 50% of list', product: 'PLAIN', kit: 'vial_only', qty: 2, now: DURING_88_NOW, sqlLineTotal: 4999 },
    { name: '8.8 promo, live sale opts out', product: 'SLIM30', kit: 'vial_only', qty: 2, now: DURING_88_NOW, sqlLineTotal: 5398.2 },
    { name: '8.8 promo replaces tiers, + kit', product: 'SALE_OFF', kit: 'complete_kit', qty: 3, now: DURING_88_NOW, sqlLineTotal: 7948.5 },
    { name: '8.8 promo, variation without sale', product: 'VARIANTS', variation: 1, kit: 'vial_only', qty: 1, now: DURING_88_NOW, sqlLineTotal: 1750 },
    { name: '8.8 window start is inclusive', product: 'PLAIN', kit: 'vial_only', qty: 1, now: AT_88_START_NOW, sqlLineTotal: 2499.5 },
    { name: '8.8 window end is exclusive', product: 'PLAIN', kit: 'vial_only', qty: 1, now: AT_88_END_NOW, sqlLineTotal: 4999 },
];

// ───────────────────────────── cart vectors (place_order end to end)

export interface CartLine {
    product: keyof typeof PARITY_CATALOG;
    variation?: number;
    kit: KitType;
    qty: number;
}

export interface CartVector {
    name: string;
    lines: CartLine[];
    location: keyof typeof PARITY_LOCATIONS;
    payment: keyof typeof PARITY_PAYMENT_METHODS;
    promo?: keyof typeof PARITY_PROMOS;
    points?: number;
    /** place_order() response as captured from the SQL run. */
    sql: { subtotal: number; shipping: number; discount: number; points: number; fee: number; total: number };
}

export interface CartTotals {
    subtotal: number;
    shipping: number;
    discount: number;
    points: number;
    fee: number;
    total: number;
}

/** Same arithmetic as Checkout.tsx at OFF_PROMO_NOW. */
export function tsCartTotals(v: CartVector): CartTotals {
    const now = new Date(OFF_PROMO_NOW);
    const items = v.lines.map((line) => {
        const cat = PARITY_CATALOG[line.product];
        const variation = line.variation === undefined ? undefined : toVariation(cat, cat.variations[line.variation]);
        const unit = getEffectiveUnitPrice(toProduct(cat), variation, line.kit, line.qty, now);
        return { quantity: line.qty, total: unit * line.qty };
    });
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const shipping = qualifiesForFreeShipping(items) ? 0 : PARITY_LOCATIONS[v.location];
    const discount = computePromoDiscount(v.promo ? PARITY_PROMOS[v.promo] : null, subtotal);
    const points = v.points ?? 0;
    const { paymentFee, total } = computeCheckoutTotals({
        subtotal,
        shippingFee: shipping,
        discount,
        pointsRedeemed: points,
        surchargePct: PARITY_PAYMENT_METHODS[v.payment].surchargePct,
    });
    return { subtotal: roundCentavos(subtotal), shipping, discount, points, fee: paymentFee, total };
}

export const CART_VECTORS: CartVector[] = [
    { name: 'plain live product, Maya', lines: [{ product: 'SLIM15', kit: 'vial_only', qty: 1 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 2399, shipping: 200, discount: 0, points: 0, fee: 0, total: 2599 } },
    { name: 'qty 2, QRPh 3%', lines: [{ product: 'SLIM15', kit: 'vial_only', qty: 2 }], location: 'JNT_METRO_MANILA', payment: 'QRPH',
        sql: { subtotal: 4318.2, shipping: 200, discount: 0, points: 0, fee: 135.55, total: 4653.75 } },
    { name: 'qty 3 single line -> free shipping, QRPh', lines: [{ product: 'NAD', kit: 'vial_only', qty: 3 }], location: 'JNT_PROVINCIAL', payment: 'QRPH',
        sql: { subtotal: 4459.95, shipping: 0, discount: 0, points: 0, fee: 133.8, total: 4593.75 } },
    { name: 'qty 5, Maya', lines: [{ product: 'SLIM30', kit: 'vial_only', qty: 5 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 12745.75, shipping: 0, discount: 0, points: 0, fee: 0, total: 12745.75 } },
    { name: 'free shipping across lines (2+1), QRPh', lines: [{ product: 'SLIM15', kit: 'vial_only', qty: 2 }, { product: 'NAD', kit: 'vial_only', qty: 1 }], location: 'JNT_METRO_MANILA', payment: 'QRPH',
        sql: { subtotal: 6067.2, shipping: 0, discount: 0, points: 0, fee: 182.02, total: 6249.22 } },
    { name: '2 bottles across lines -> paid shipping', lines: [{ product: 'SLIM15', kit: 'vial_only', qty: 1 }, { product: 'NAD', kit: 'vial_only', qty: 1 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 4148, shipping: 200, discount: 0, points: 0, fee: 0, total: 4348 } },
    { name: 'plain product, no sale', lines: [{ product: 'PLAIN', kit: 'vial_only', qty: 1 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 4999, shipping: 200, discount: 0, points: 0, fee: 0, total: 5199 } },
    { name: 'inactive sale, qty 2', lines: [{ product: 'SALE_OFF', kit: 'vial_only', qty: 2 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 8998.2, shipping: 200, discount: 0, points: 0, fee: 0, total: 9198.2 } },
    { name: 'bundle tier qty 2', lines: [{ product: 'TIERS', kit: 'vial_only', qty: 2 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 4500, shipping: 200, discount: 0, points: 0, fee: 0, total: 4700 } },
    { name: 'bundle tier qty 3 + complete_kit, QRPh', lines: [{ product: 'TIERS', kit: 'complete_kit', qty: 3 }], location: 'JNT_METRO_MANILA', payment: 'QRPH',
        sql: { subtotal: 6450, shipping: 0, discount: 0, points: 0, fee: 193.5, total: 6643.5 } },
    { name: 'tier price 0 ignored (qty 4)', lines: [{ product: 'TIERS', kit: 'vial_only', qty: 4 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 8500, shipping: 0, discount: 0, points: 0, fee: 0, total: 8500 } },
    { name: 'variation with own sale', lines: [{ product: 'VARIANTS', variation: 0, kit: 'vial_only', qty: 1 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 2800, shipping: 200, discount: 0, points: 0, fee: 0, total: 3000 } },
    { name: 'variation sale off, qty 2', lines: [{ product: 'VARIANTS', variation: 1, kit: 'vial_only', qty: 2 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 6300, shipping: 200, discount: 0, points: 0, fee: 0, total: 6500 } },
    { name: 'variation qty 3 -> product tier', lines: [{ product: 'VARIANTS', variation: 1, kit: 'vial_only', qty: 3 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 9999, shipping: 0, discount: 0, points: 0, fee: 0, total: 9999 } },
    { name: 'centavo variation + kit qty 2', lines: [{ product: 'VARIANTS', variation: 2, kit: 'complete_kit', qty: 2 }], location: 'JNT_METRO_MANILA', payment: 'MAYA',
        sql: { subtotal: 3899.98, shipping: 200, discount: 0, points: 0, fee: 0, total: 4099.98 } },
    { name: 'QRPh fee rounding (2199.99 x 3%)', lines: [{ product: 'VARIANTS', variation: 2, kit: 'vial_only', qty: 1 }], location: 'JNT_METRO_MANILA', payment: 'QRPH',
        sql: { subtotal: 1999.99, shipping: 200, discount: 0, points: 0, fee: 66, total: 2265.99 } },
    { name: 'centavo price qty 5 (sub-centavo sum), QRPh', lines: [{ product: 'VARIANTS', variation: 2, kit: 'vial_only', qty: 5 }], location: 'JNT_METRO_MANILA', payment: 'QRPH',
        sql: { subtotal: 8499.96, shipping: 0, discount: 0, points: 0, fee: 255, total: 8754.96 } },
    { name: 'fixed promo SAVEBIG, QRPh', lines: [{ product: 'SLIMGLOW', kit: 'vial_only', qty: 3 }], location: 'JNT_METRO_MANILA', payment: 'QRPH', promo: 'SAVEBIG',
        sql: { subtotal: 11472.45, shipping: 0, discount: 4500, points: 0, fee: 209.17, total: 7181.62 } },
    { name: 'percentage promo 10% capped at 500, QRPh', lines: [{ product: 'SLIM30', kit: 'vial_only', qty: 2 }], location: 'JNT_METRO_MANILA', payment: 'QRPH', promo: 'PARITYPCT',
        sql: { subtotal: 5398.2, shipping: 200, discount: 500, points: 0, fee: 152.95, total: 5251.15 } },
    { name: 'percentage promo 12.5% half-centavo', lines: [{ product: 'NAD', kit: 'vial_only', qty: 1 }], location: 'JNT_METRO_MANILA', payment: 'MAYA', promo: 'PARITYPCT2',
        sql: { subtotal: 1749, shipping: 200, discount: 218.63, points: 0, fee: 0, total: 1730.37 } },
    { name: 'points redeemed, QRPh', lines: [{ product: 'SLIM30', kit: 'vial_only', qty: 2 }], location: 'JNT_METRO_MANILA', payment: 'QRPH', points: 777,
        sql: { subtotal: 5398.2, shipping: 200, discount: 0, points: 777, fee: 144.64, total: 4965.84 } },
    { name: 'promo + points, QRPh', lines: [{ product: 'SLIMGLOW', kit: 'vial_only', qty: 3 }], location: 'JNT_METRO_MANILA', payment: 'QRPH', promo: 'SAVEBIG', points: 1000,
        sql: { subtotal: 11472.45, shipping: 0, discount: 4500, points: 1000, fee: 179.17, total: 6151.62 } },
];
