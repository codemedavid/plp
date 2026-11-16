import { forwardRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { HOLIDAY_SALE_END, HOLIDAY_SALE_HEADLINE_PCT } from '../../lib/holidaySeason';
import { OrnamentCluster, Snowfall } from './HolidayDecor';

const MS_PER_DAY = 86_400_000;

const daysLeftLabel = (now: Date = new Date()): string => {
  const days = Math.ceil((HOLIDAY_SALE_END.getTime() - now.getTime()) / MS_PER_DAY);
  if (days <= 1) return 'Last day';
  return `${days} days left`;
};

type Props = {
  onShopAll: () => void;
};

// Opening slide of the hero carousel while the ber-months sale runs: a navy
// winter night with snowfall, hanging baubles and an oversized gold "40%".
const HolidayHeroSlide = forwardRef<HTMLDivElement, Props>(({ onShopAll }, ref) => (
  <div
    ref={ref}
    className="relative shrink-0 overflow-hidden bg-navy-900 text-cream-light"
    style={{ flex: '0 0 100%' }}
  >
    <div aria-hidden="true" className="holiday-hero__glow absolute inset-0" />
    <Snowfall />
    <OrnamentCluster side="left" />
    <OrnamentCluster side="right" />

    <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 pb-14 pt-24 text-center sm:pb-20 sm:pt-28 md:flex-row md:items-center md:gap-14 md:text-left">
      {/* Oversized figure — the one thing a passer-by should read */}
      <p className="shrink-0 font-heading leading-none text-gold-400">
        <span className="block text-[11px] font-sans font-semibold uppercase tracking-[0.32em] text-gold-300 md:text-xs">
          Up to
        </span>
        <span className="block text-[88px] font-medium sm:text-[120px] md:text-[150px]">
          {HOLIDAY_SALE_HEADLINE_PCT}
          <span className="align-top text-[44px] sm:text-[60px] md:text-[72px]">%</span>
        </span>
        <span className="block text-[11px] font-sans font-semibold uppercase tracking-[0.32em] text-gold-300 md:text-xs">
          Off sitewide
        </span>
      </p>

      <span aria-hidden="true" className="hidden h-40 w-px bg-gold-500/40 md:block" />

      <div className="flex max-w-md flex-col items-center gap-4 md:items-start">
        <span className="inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-gold-400 sm:text-[11px]">
          <span className="h-px w-6 bg-gold-500" />
          Till the year ends · {daysLeftLabel()}
        </span>
        <h2 className="font-heading text-[30px] font-medium leading-[1.1] text-cream-light sm:text-5xl">
          The <em className="text-gold-400">Ber Months</em> Sale
        </h2>
        <p className="text-[13px] leading-relaxed text-navy-100 sm:text-base">
          Our small Christmas gift to you — sale prices across the shop, every day until
          New Year&rsquo;s Eve.
        </p>
        <button
          type="button"
          onClick={onShopAll}
          className="holiday-cta group mt-1 inline-flex items-center gap-3 bg-gold-500 px-7 py-3.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-navy-900 transition-colors hover:bg-cream-light focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 sm:px-10 sm:py-4 sm:text-[13px]"
          style={{ borderRadius: '2px' }}
        >
          Shop the Sale
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  </div>
));

HolidayHeroSlide.displayName = 'HolidayHeroSlide';

export default HolidayHeroSlide;
