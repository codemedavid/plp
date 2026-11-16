import type { MouseEvent, ReactNode, Ref } from 'react';
import { ArrowRight, QrCode, X } from 'lucide-react';
import { splitOfferFigure, type HolidayPopupContent } from '../../lib/holidayPopupSettings';
import { OrnamentCluster, Snowfall } from './HolidayDecor';

interface HolidayPopupCardProps {
  copy: HolidayPopupContent;
  titleId: string;
  /** Render as the live modal dialog. Off for the admin preview. */
  asDialog?: boolean;
  onClose?: () => void;
  onShop?: (event: MouseEvent<HTMLAnchorElement>) => void;
  ctaRef?: Ref<HTMLAnchorElement>;
}

const CTA_CLASS =
  'group inline-flex w-full items-center justify-between gap-6 bg-navy-900 px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-white transition-all hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2';

const SMALL_CAPS = 'text-[13px] font-sans font-semibold uppercase tracking-[0.3em] text-gold-300';

// Big header figure: "Up to 50% off" sets the percentage large; any other
// offer ("Buy 1 Take 1") is shown as one headline.
function OfferHeadline({ offer }: { offer: string }) {
  const parts = splitOfferFigure(offer);
  if (!parts) {
    return (
      <p className="absolute inset-x-6 bottom-5 text-center font-heading text-3xl font-medium leading-tight text-gold-400">
        {offer}
      </p>
    );
  }
  return (
    <p className="absolute inset-x-0 bottom-5 text-center font-heading leading-none text-gold-400">
      {parts.before && <span className={SMALL_CAPS}>{parts.before}</span>}
      <span className="text-6xl font-medium">{parts.figure}</span>
      {parts.after && <span className={SMALL_CAPS}>{parts.after}</span>}
    </p>
  );
}

const PAYMENT_NOTE_EYEBROW = 'New payment option';

// Compact "payment news" row: a navy QR tile on a cream, gold-ruled strip, so it
// reads as part of the card rather than as a generic alert banner.
function PaymentNote({ note }: { note: string }) {
  return (
    <div
      role="note"
      className="mb-6 flex items-center gap-3 border border-gold-300 border-l-2 border-l-gold-500 bg-cream px-3 py-2.5 text-left"
      style={{ borderRadius: '2px' }}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center bg-navy-900 text-gold-400"
        style={{ borderRadius: '2px' }}
      >
        <QrCode className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-gold-700">
          {PAYMENT_NOTE_EYEBROW}
        </span>
        <span className="mt-0.5 block break-words text-[13px] leading-snug text-navy-900">{note}</span>
      </span>
    </div>
  );
}

function ShopButton({ label, onShop, ctaRef, isInteractive }: { label: string; isInteractive: boolean } & Pick<HolidayPopupCardProps, 'onShop' | 'ctaRef'>) {
  const content: ReactNode = (
    <>
      {label}
      <ArrowRight className="h-4 w-4 text-gold-400 transition-transform group-hover:translate-x-1" strokeWidth={1.8} />
    </>
  );
  if (!isInteractive) {
    return (
      <span className={CTA_CLASS} style={{ borderRadius: '2px' }}>
        {content}
      </span>
    );
  }
  return (
    <a ref={ctaRef} href="/#products" onClick={onShop} className={CTA_CLASS} style={{ borderRadius: '2px' }}>
      {content}
    </a>
  );
}

// The festive card itself. All copy is rendered as plain text — it can come
// from the admin, so never as HTML.
export default function HolidayPopupCard({ copy, titleId, asDialog = false, onClose, onShop, ctaRef }: HolidayPopupCardProps) {
  const dialogProps = asDialog
    ? { role: 'dialog' as const, 'aria-modal': true, 'aria-labelledby': titleId }
    : {};

  return (
    <div
      {...dialogProps}
      className="relative w-full max-w-md overflow-hidden border border-gold-300 bg-cream-light shadow-2xl animate-fade-in-up"
      style={{ borderRadius: '2px' }}
    >
      {/* Winter-night header band */}
      <div className="relative h-36 overflow-hidden bg-navy-900">
        <div aria-hidden="true" className="holiday-hero__glow absolute inset-0" />
        <Snowfall />
        <OrnamentCluster side="left" />
        <OrnamentCluster side="right" />
        <OfferHeadline offer={copy.offer} />
      </div>
      <div aria-hidden="true" className="holiday-ribbon h-1.5 w-full" />

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 p-1.5 text-cream-light/70 transition-colors hover:text-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
          aria-label="Close"
        >
          <X size={18} strokeWidth={1.8} />
        </button>
      )}

      <div className="px-8 pb-8 pt-7 text-center">
        <span className="mb-3 block text-[11px] uppercase tracking-[0.32em] text-gold-600">{copy.eyebrow}</span>
        <h2 id={titleId} className="mb-3 break-words font-heading text-3xl leading-tight text-navy-900">
          {copy.title}
        </h2>
        <div className="mx-auto mb-5 h-px w-10 bg-gold-500" />
        <p className="mx-auto mb-2 max-w-xs break-words text-sm font-light leading-relaxed text-charcoal-500">
          {copy.message}
        </p>
        <p className={`${copy.paymentNoteEnabled ? 'mb-5' : 'mb-7'} text-base text-navy-900`}>
          <strong className="font-semibold">{copy.offer}</strong> — so shop now.
        </p>

        {copy.paymentNoteEnabled && <PaymentNote note={copy.paymentNote} />}

        <ShopButton label={copy.buttonLabel} onShop={onShop} ctaRef={ctaRef} isInteractive={asDialog} />
      </div>
    </div>
  );
}
