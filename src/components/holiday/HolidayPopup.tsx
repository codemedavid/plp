import { useEffect, useRef, useState, type MouseEvent } from 'react';
import posthog from 'posthog-js';
import { isHolidayPopupLive, type HolidayPopupConfig } from '../../lib/holidayPopupSettings';
import HolidayPopupCard from './HolidayPopupCard';

export const HOLIDAY_POPUP_DELAY_MS = 1500;
const SEEN_KEY = 'plp_holiday_popup_seen';
const TITLE_ID = 'holiday-popup-title';

// Storage can throw (private mode, blocked site data). Failing open just means
// the popup may show again next visit — never a broken page.
const hasSeenThisSession = (): boolean => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === 'true';
  } catch {
    return false;
  }
};

const markSeen = (): void => {
  try {
    sessionStorage.setItem(SEEN_KEY, 'true');
  } catch {
    // Ignore — see hasSeenThisSession.
  }
};

interface HolidayPopupProps {
  /** Resolved (admin settings + fallbacks) — see resolveHolidayPopupConfig. */
  config: HolidayPopupConfig;
}

export default function HolidayPopup({ config }: HolidayPopupProps) {
  const [visible, setVisible] = useState(false);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const isLive = isHolidayPopupLive(config);

  useEffect(() => {
    if (!isLive || hasSeenThisSession()) return;
    const timer = setTimeout(() => setVisible(true), HOLIDAY_POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLive]);

  const close = () => {
    setVisible(false);
    markSeen();
  };

  // Escape closes; focus lands on the CTA so keyboard users start inside.
  useEffect(() => {
    if (!visible) return;
    ctaRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible]);

  const handleShop = (event: MouseEvent<HTMLAnchorElement>) => {
    posthog.capture('plp_holiday_popup_shop_click');
    const products = document.getElementById('products');
    if (products) {
      event.preventDefault();
      products.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    close();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-navy-900/70 backdrop-blur-sm" onClick={close} />
      <HolidayPopupCard
        copy={config}
        titleId={TITLE_ID}
        asDialog
        onClose={close}
        onShop={handleShop}
        ctaRef={ctaRef}
      />
    </div>
  );
}
