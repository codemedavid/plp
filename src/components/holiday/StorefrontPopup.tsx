import { Suspense, lazy } from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { isHolidayPopupLive, resolveHolidayPopupConfig } from '../../lib/holidayPopupSettings';

const WelcomePopup = lazy(() => import('../WelcomePopup'));
const HolidayPopup = lazy(() => import('./HolidayPopup'));

// One popup at a time: the holiday popup while the admin has it on and we are
// inside its window, otherwise the regular welcome popup. Nothing renders until
// settings have loaded; if loading failed, the defaults (shipped copy + code
// window) decide.
export default function StorefrontPopup() {
  const { siteSettings, loading } = useSiteSettings();
  if (loading) return null;

  const config = resolveHolidayPopupConfig(siteSettings);
  return (
    <Suspense fallback={null}>
      {isHolidayPopupLive(config) ? <HolidayPopup config={config} /> : <WelcomePopup />}
    </Suspense>
  );
}
