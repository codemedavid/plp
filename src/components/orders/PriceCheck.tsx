import { parsePricingMismatch } from '../../lib/pricingMismatch';

type Props = {
  pricingMismatch: unknown;
};

const formatAmount = (n: number | null): string =>
  n === null ? 'Not sent' : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Small amber pill for the orders list / detail header. Renders nothing when not flagged. */
export function PriceCheckBadge({ pricingMismatch }: Props) {
  if (!parsePricingMismatch(pricingMismatch)) return null;
  return (
    <span
      title="Checkout prices differed from the server's — verify the amount paid"
      className="inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300"
    >
      <span aria-hidden="true">⚠</span>
      Price check
    </span>
  );
}

/** Explanation panel for the order detail view. Renders nothing when not flagged. */
export function PriceCheckNotice({ pricingMismatch }: Props) {
  const mismatch = parsePricingMismatch(pricingMismatch);
  if (!mismatch) return null;

  const rows = [
    { label: 'Items subtotal', client: mismatch.clientSubtotal, server: mismatch.serverSubtotal },
    { label: 'Shipping', client: mismatch.clientShipping, server: mismatch.serverShipping },
  ];

  return (
    <section
      role="note"
      aria-label="Price check"
      className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900"
    >
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <span aria-hidden="true">⚠</span> Price check
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed">
        The customer's checkout showed different prices than the server. The order was saved at server prices, so
        the customer may have paid a different amount than the total below. Verify the amount on the payment proof
        before confirming.
      </p>
      <table className="mt-3 w-full max-w-md text-[13px]">
        <thead>
          <tr className="text-left text-amber-800/80">
            <th className="py-1 pr-3 font-semibold" scope="col"></th>
            <th className="py-1 pr-3 font-semibold" scope="col">Customer saw</th>
            <th className="py-1 font-semibold" scope="col">Server price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-amber-200">
              <th className="py-1.5 pr-3 text-left font-medium" scope="row">{row.label}</th>
              <td className="py-1.5 pr-3 font-semibold tabular-nums">{formatAmount(row.client)}</td>
              <td className="py-1.5 font-semibold tabular-nums">{formatAmount(row.server)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
