import { useEffect, useState } from 'react';
import { useCouriers } from '../../hooks/useCouriers';
import { copyText, buildAddressText, buildBookingText } from './orderClipboard';
import type { Order } from './types';

interface OrderDetailsViewProps {
  order: Order;
  onBack: () => void;
  onConfirm: () => void;
  onUpdateStatus: (orderId: string, status: string, extras?: Record<string, string>) => void;
  onSaveTracking: (orderId: string, trackingNumber: string, shippingProvider: string, shippingNote: string) => void;
  isProcessing: boolean;
}

const peso = (n: number): string => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-[#fef6dc] text-[#a07b15]',
  confirmed: 'bg-[#eaf1fb] text-[#2f6fc0]',
  processing: 'bg-[#f3eafc] text-[#7a3fc0]',
  shipped: 'bg-[#e9ecfb] text-[#3f4fc0]',
  delivered: 'bg-[#e7f6ee] text-[#1f9d57]',
  cancelled: 'bg-[#fdeaea] text-[#c0392f]',
};

const STATUS_DOT: Record<string, string> = {
  new: 'bg-[#e0a915]',
  confirmed: 'bg-[#2f6fc0]',
  processing: 'bg-[#7a3fc0]',
  shipped: 'bg-[#3f4fc0]',
  delivered: 'bg-[#1f9d57]',
  cancelled: 'bg-[#c0392f]',
};

const titleCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function formatPlaced(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface CopyButtonProps {
  value: string;
  label: string;
  children?: React.ReactNode;
  className?: string;
}

function CopyButton({ value, label, children, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <button
      type="button"
      aria-label={label}
      onClick={handleCopy}
      className={
        className ??
        'flex-shrink-0 inline-flex items-center gap-1.5 bg-white border border-[#e2e7ef] rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#46505f] hover:bg-[#eef2f8] transition-colors'
      }
    >
      {children ?? (
        <>
          <span className="opacity-70">⧉</span>
          {copied ? 'Copied' : 'Copy'}
        </>
      )}
    </button>
  );
}

interface FieldCardProps {
  label: string;
  value: string;
  copyLabel: string;
}

function FieldCard({ label, value, copyLabel }: FieldCardProps) {
  return (
    <div className="bg-[#fafbfd] border border-[#eef1f6] rounded-xl px-3.5 py-3">
      <div className="text-xs text-[#7a8597] font-semibold mb-1.5">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-[#1f2937] truncate">{value || '—'}</span>
        {value ? <CopyButton value={value} label={copyLabel} /> : null}
      </div>
    </div>
  );
}

interface AddressRowProps {
  label: string;
  value: string | null;
  copyLabel: string;
}

function AddressRow({ label, value, copyLabel }: AddressRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#eef1f6] last:border-b-0">
      <span className="w-28 flex-shrink-0 text-[#7a8597] font-medium text-[13px]">{label}</span>
      {value ? (
        <>
          <span className="flex-1 min-w-0 text-[#1f2937] font-semibold text-sm truncate">{value}</span>
          <CopyButton value={value} label={copyLabel} />
        </>
      ) : (
        <span className="flex-1 min-w-0 text-[#9aa4b2] text-sm">—</span>
      )}
    </div>
  );
}

const cardClass =
  'bg-white border border-[#eaeef4] rounded-2xl p-6 shadow-[0_1px_3px_rgba(16,24,40,.05)]';
const iconChip = 'grid place-items-center w-[30px] h-[30px] rounded-[9px] text-[15px]';
const sectionTitle = 'text-base font-bold text-[#111827] flex items-center gap-2.5';

function contactLabel(method: string | null): string {
  if (!method) return '—';
  if (method.toLowerCase() === 'whatsapp') return 'WhatsApp';
  return titleCase(method);
}

export default function OrderDetailsView({
  order,
  onBack,
  onConfirm,
  onUpdateStatus,
  onSaveTracking,
  isProcessing,
}: OrderDetailsViewProps) {
  const { couriers } = useCouriers();
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [shippingProvider, setShippingProvider] = useState(order.shipping_provider || 'jnt');
  const [shippingNote, setShippingNote] = useState(order.shipping_note || '');

  useEffect(() => {
    setTrackingNumber(order.tracking_number || '');
    setShippingProvider(order.shipping_provider || 'jnt');
    setShippingNote(order.shipping_note || '');
  }, [order]);

  const activeCouriers = couriers.filter((c) => c.is_active);
  const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const shippingFee = order.shipping_fee || 0;
  const discount = order.discount_applied || 0;
  const points = order.points_redeemed || 0;
  const subtotal = order.total_price + discount + points;
  const finalTotal = order.total_price + shippingFee;
  const isPaid = order.payment_status === 'paid';

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === order.order_status) return;
    const label = titleCase(newStatus);
    if (newStatus === 'cancelled') {
      if (!window.confirm('Are you sure you want to cancel this order?')) return;
      const reason = window.prompt('Cancellation reason (shown to customer):', 'Customer request') || 'Not specified';
      const refundAmount = window.prompt('Refund amount (PHP):', String(order.total_price || 0)) || '0';
      const refundMethod = window.prompt('Refund method (e.g. GCash, Bank Transfer, Store Credit):', 'Original payment method') || 'N/A';
      const refundStatus = window.prompt('Refund status (Pending / Processing / Completed / Not applicable):', 'Pending') || 'Pending';
      onUpdateStatus(order.id, newStatus, {
        cancellation_reason: String(reason),
        refund_amount: String(refundAmount),
        refund_method: String(refundMethod),
        refund_status: String(refundStatus),
      });
      return;
    }
    if (window.confirm(`Change order status to "${label}"?`)) {
      onUpdateStatus(order.id, newStatus);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] px-8 py-7 pb-16 font-['Plus_Jakarta_Sans',system-ui,sans-serif]">
      <div className="max-w-[1180px] mx-auto">
        {/* Top bar */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-white border border-[#e2e7ef] rounded-[10px] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#46505f] shadow-[0_1px_2px_rgba(16,24,40,.04)] hover:bg-[#f6f8fc] transition-colors"
          >
            <span className="text-[15px] leading-none">←</span> Back to Orders
          </button>
          <div className="flex items-baseline gap-3.5 flex-wrap">
            <h1 className="text-[26px] font-extrabold text-[#111827] tracking-[-.02em]">
              Order {order.order_number || order.id.slice(0, 8).toUpperCase()}
            </h1>
            <span className="text-[13px] text-[#7a8597] font-medium">Placed {formatPlaced(order.created_at)}</span>
          </div>
        </div>

        {/* Layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* LEFT / MAIN */}
          <div className="flex flex-col gap-5">
            {/* Customer */}
            <section className={cardClass}>
              <div className="flex items-center justify-between gap-3" style={{ marginBottom: 18 }}>
                <h2 className={sectionTitle}>
                  <span className={`${iconChip} bg-[#eaf1fb] text-[#2f6fc0]`}>👤</span>
                  Customer Information
                </h2>
                <CopyButton
                  value={buildBookingText(order)}
                  label="Copy all for booking"
                  className="inline-flex items-center gap-1.5 bg-white border border-[#e2e7ef] rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-[#46505f] hover:bg-[#f6f8fc] transition-colors"
                >
                  <span className="opacity-70">⧉</span> Copy all for booking
                </CopyButton>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldCard label="Name" value={order.customer_name} copyLabel="Copy name" />
                <FieldCard label="Email" value={order.customer_email} copyLabel="Copy email" />
                <FieldCard label="Phone" value={order.customer_phone} copyLabel="Copy phone" />
                <div className="bg-[#fafbfd] border border-[#eef1f6] rounded-xl px-3.5 py-3">
                  <div className="text-xs text-[#7a8597] font-semibold mb-1.5">Contact Method</div>
                  <div className="flex items-center gap-2 h-[29px]">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1f9d57]">
                      <span className="grid place-items-center w-[18px] h-[18px] rounded-full bg-[#25d366] text-white text-[10px]">✓</span>
                      {contactLabel(order.contact_method)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Shipping address */}
            <section className={cardClass}>
              <div className="flex items-center justify-between gap-3" style={{ marginBottom: 18 }}>
                <h2 className={sectionTitle}>
                  <span className={`${iconChip} bg-[#eaf1fb] text-[#2f6fc0]`}>📍</span>
                  Shipping Address
                </h2>
                <CopyButton
                  value={buildAddressText(order)}
                  label="Copy address"
                  className="inline-flex items-center gap-1.5 bg-white border border-[#e2e7ef] rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-[#46505f] hover:bg-[#f6f8fc] transition-colors"
                >
                  <span className="opacity-70">⧉</span> Copy address
                </CopyButton>
              </div>
              <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-xl overflow-hidden">
                <AddressRow label="Street" value={order.shipping_address} copyLabel="Copy street" />
                <AddressRow label="Barangay" value={order.shipping_barangay} copyLabel="Copy barangay" />
                <AddressRow
                  label="City / Province"
                  value={`${order.shipping_city}, ${order.shipping_state}`.replace(/^,\s*|,\s*$/g, '')}
                  copyLabel="Copy city"
                />
                <AddressRow label="Postal Code" value={order.shipping_zip_code} copyLabel="Copy postal code" />
                <AddressRow label="Region" value={order.shipping_location} copyLabel="Copy region" />
              </div>
            </section>

            {/* Shipping & tracking */}
            <section className={cardClass}>
              <h2 className={sectionTitle} style={{ marginBottom: 18 }}>
                <span className={`${iconChip} bg-[#e7f6ee] text-[#1f9d57]`}>🚚</span>
                Shipping &amp; Tracking
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3.5 mb-4">
                <div>
                  <label htmlFor="courier-select" className="block text-[12.5px] font-semibold text-[#46505f] mb-1.5">
                    Courier
                  </label>
                  <div className="relative">
                    <select
                      id="courier-select"
                      value={shippingProvider}
                      onChange={(e) => setShippingProvider(e.target.value)}
                      className="w-full appearance-none bg-white border border-[#dbe1ea] rounded-[10px] py-2.5 pl-3 pr-9 text-sm font-semibold text-[#1f2937] cursor-pointer focus:outline-none focus:border-[#2f6fc0]"
                    >
                      {activeCouriers.map((courier) => (
                        <option key={courier.id} value={courier.code}>
                          {courier.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#9aa4b2] text-[11px]">▼</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="tracking-input" className="block text-[12.5px] font-semibold text-[#46505f] mb-1.5">
                    Tracking Number
                  </label>
                  <input
                    id="tracking-input"
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full bg-white border border-[#dbe1ea] rounded-[10px] px-3 py-2.5 text-sm text-[#1f2937] focus:outline-none focus:border-[#2f6fc0]"
                  />
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="note-input" className="block text-[12.5px] font-semibold text-[#46505f] mb-1.5">
                  Shipping Note <span className="text-[#9aa4b2] font-medium">(optional)</span>
                </label>
                <input
                  id="note-input"
                  type="text"
                  value={shippingNote}
                  onChange={(e) => setShippingNote(e.target.value)}
                  placeholder="e.g., Shipped via J&T Express…"
                  className="w-full bg-white border border-[#dbe1ea] rounded-[10px] px-3 py-2.5 text-sm text-[#1f2937] focus:outline-none focus:border-[#2f6fc0]"
                />
              </div>
              <button
                type="button"
                onClick={() => onSaveTracking(order.id, trackingNumber, shippingProvider, shippingNote)}
                disabled={isProcessing}
                className="w-full bg-[#2f6fc0] text-white rounded-[11px] py-3 text-sm font-bold shadow-[0_2px_8px_rgba(47,111,192,.28)] hover:bg-[#2861ac] transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Saving…' : 'Save Tracking Info'}
              </button>
            </section>

            {/* Order items */}
            <section className={cardClass}>
              <h2 className="text-base font-bold text-[#111827] flex items-center gap-2" style={{ marginBottom: 18 }}>
                Order Items
                <span className="text-xs font-semibold text-[#2f6fc0] bg-[#eaf1fb] px-2.5 py-0.5 rounded-full">
                  {totalItems}
                </span>
              </h2>
              <div className="flex flex-col gap-2.5">
                {order.order_items.map((item, index) => (
                  <div
                    key={`${item.product_id ?? item.product_name}-${item.variation_name ?? 'novar'}-${index}`}
                    className="flex items-center gap-3.5 p-3.5 border border-[#eef1f6] rounded-xl"
                  >
                    <div className="w-[52px] h-[52px] rounded-[10px] bg-[#f3f5f9] grid place-items-center text-[22px] flex-shrink-0 overflow-hidden">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        '💊'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-bold text-[#111827] truncate">
                        {item.product_name}
                        {item.variation_name ? ` · ${item.variation_name}` : ''}
                      </div>
                      <div className="text-[13px] text-[#7a8597] mt-0.5">
                        Qty {item.quantity} · {peso(item.price)} each
                      </div>
                    </div>
                    <div className="text-[15px] font-bold text-[#111827]">{peso(item.total)}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Payment proof */}
            {order.payment_proof_url && (
              <section className={cardClass}>
                <div className="flex items-center justify-between gap-3" style={{ marginBottom: 18 }}>
                  <h2 className={sectionTitle}>
                    <span className={`${iconChip} bg-[#eaf1fb] text-[#2f6fc0]`}>🧾</span>
                    Payment Proof
                  </h2>
                  <a
                    href={order.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-[#e2e7ef] rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-[#46505f] hover:bg-[#f6f8fc] transition-colors"
                  >
                    View full size
                  </a>
                </div>
                <div className="w-[240px] h-[200px] rounded-xl border border-[#eef1f6] bg-[#fdf8ef] grid place-items-center overflow-hidden">
                  <img
                    src={order.payment_proof_url}
                    alt="Payment proof"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </section>
            )}
          </div>

          {/* RIGHT / SIDEBAR */}
          <div className="lg:sticky lg:top-6 flex flex-col gap-5">
            {/* Status + action */}
            <section className="bg-white border border-[#eaeef4] rounded-2xl p-[22px] shadow-[0_1px_3px_rgba(16,24,40,.05)]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-bold text-[#7a8597] uppercase tracking-[.06em]">Order Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[12.5px] font-bold px-2.5 py-1 rounded-full ${
                    STATUS_BADGE[order.order_status] || STATUS_BADGE.new
                  }`}
                >
                  <span className={`w-[7px] h-[7px] rounded-full ${STATUS_DOT[order.order_status] || STATUS_DOT.new}`} />
                  {titleCase(order.order_status)}
                </span>
              </div>
              <div className="relative mb-3.5">
                <select
                  aria-label="Order status"
                  value={order.order_status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isProcessing}
                  className="w-full appearance-none bg-white border border-[#dbe1ea] rounded-[11px] py-3 pl-3.5 pr-10 text-sm font-semibold text-[#1f2937] cursor-pointer focus:outline-none focus:border-[#2f6fc0] disabled:opacity-50"
                >
                  <option value="new">New</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#9aa4b2] text-[11px]">▼</span>
              </div>
              {order.order_status === 'new' && (
                <>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isProcessing}
                    className="w-full inline-flex items-center justify-center gap-2.5 bg-[#1f9d57] text-white rounded-[11px] py-3 text-sm font-bold shadow-[0_2px_10px_rgba(31,157,87,.3)] hover:bg-[#1b8a4d] transition-colors disabled:opacity-50"
                  >
                    <span>✓</span> {isProcessing ? 'Processing…' : 'Confirm & Deduct Stock'}
                  </button>
                  <p className="text-xs text-[#9aa4b2] text-center mt-2.5 leading-relaxed">
                    Confirming reduces inventory and notifies the customer.
                  </p>
                </>
              )}
            </section>

            {/* Payment summary */}
            <section className="bg-white border border-[#eaeef4] rounded-2xl p-[22px] shadow-[0_1px_3px_rgba(16,24,40,.05)]">
              <h2 className="text-base font-bold text-[#111827] mb-4">Payment</h2>
              <div className="flex items-center justify-between pb-3.5 border-b border-[#eef1f6] mb-3.5">
                <div>
                  <div className="text-[12.5px] text-[#7a8597] font-medium">Method</div>
                  <div className="text-sm font-bold text-[#1f2937] mt-0.5 capitalize">
                    {order.payment_method_name || 'N/A'}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-[12.5px] font-bold px-2.5 py-1 rounded-full ${
                    isPaid ? 'bg-[#e7f6ee] text-[#1f9d57]' : 'bg-[#fef6dc] text-[#a07b15]'
                  }`}
                >
                  {isPaid ? '✓ Paid' : 'Pending'}
                </span>
              </div>
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between text-[#46505f]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#1f2937]">{peso(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#1f9d57]">
                    <span>Discount{order.promo_code ? ` (${order.promo_code})` : ''}</span>
                    <span className="font-semibold">-{peso(discount)}</span>
                  </div>
                )}
                {points > 0 && (
                  <div className="flex justify-between text-[#1f9d57]">
                    <span>Points Used</span>
                    <span className="font-semibold">-{peso(points)} ({points.toLocaleString('en-PH')} pts)</span>
                  </div>
                )}
                <div className="flex justify-between text-[#46505f]">
                  <span>Shipping Fee</span>
                  <span className="font-semibold text-[#1f2937]">{peso(shippingFee)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3.5 pt-3.5 border-t border-[#eef1f6]">
                <span className="text-[15px] font-bold text-[#111827]">Total</span>
                <span className="text-xl font-extrabold text-[#111827] tracking-[-.02em]">{peso(finalTotal)}</span>
              </div>
            </section>

            {order.notes && (
              <section className="bg-white border border-[#eaeef4] rounded-2xl p-[22px] shadow-[0_1px_3px_rgba(16,24,40,.05)]">
                <h2 className="text-base font-bold text-[#111827] mb-3">Notes</h2>
                <p className="text-sm text-[#46505f] leading-relaxed">{order.notes}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
