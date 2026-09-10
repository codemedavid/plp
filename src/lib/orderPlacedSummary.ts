/**
 * Shape of the order recap handed to the /order-placed page through router
 * state. Router state survives a client-side navigation but not a refresh or a
 * pasted URL, so the page must render sensibly when this is absent — hence the
 * defensive parser rather than a bare cast.
 */
export interface OrderPlacedItem {
    /** Product name, already merged with its variation label. */
    name: string;
    quantity: number;
    total: number;
}

export interface OrderPlacedSummary {
    orderNumber: string;
    email: string;
    customerName: string;
    items: OrderPlacedItem[];
    subtotal: number;
    shippingFee: number;
    discount: number;
    pointsRedeemed: number;
    total: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const toAmount = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;

const toText = (value: unknown): string => (typeof value === 'string' ? value : '');

const toItem = (value: unknown): OrderPlacedItem | null => {
    if (!isRecord(value)) return null;

    const name = toText(value.name).trim();
    const quantity = toAmount(value.quantity);
    if (!name || quantity <= 0) return null;

    return { name, quantity, total: toAmount(value.total) };
};

/**
 * Validates untrusted router state into an order recap, or null when the page
 * was reached without one (direct visit, refresh, shared link).
 */
export function parseOrderPlacedSummary(state: unknown): OrderPlacedSummary | null {
    if (!isRecord(state)) return null;

    const orderNumber = toText(state.orderNumber).trim();
    if (!orderNumber) return null;

    const items = Array.isArray(state.items)
        ? state.items.map(toItem).filter((item): item is OrderPlacedItem => item !== null)
        : [];

    return {
        orderNumber,
        email: toText(state.email).trim(),
        customerName: toText(state.customerName).trim(),
        items,
        subtotal: toAmount(state.subtotal),
        shippingFee: toAmount(state.shippingFee),
        discount: toAmount(state.discount),
        pointsRedeemed: toAmount(state.pointsRedeemed),
        total: toAmount(state.total),
    };
}
