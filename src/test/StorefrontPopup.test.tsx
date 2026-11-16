import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SiteSettings } from '../types';
import type { HolidayPopupConfig } from '../lib/holidayPopupSettings';

interface MockSettingsState {
  siteSettings: Partial<SiteSettings> | null;
  loading: boolean;
  error: string | null;
}

const settingsState: MockSettingsState = { siteSettings: null, loading: false, error: null };

vi.mock('../hooks/useSiteSettings', () => ({
  useSiteSettings: () => settingsState,
}));

vi.mock('../components/WelcomePopup', () => ({
  default: () => <div data-testid="welcome-popup" />,
}));

vi.mock('../components/holiday/HolidayPopup', () => ({
  default: ({ config }: { config: HolidayPopupConfig }) => (
    <div data-testid="holiday-popup">{config.title}</div>
  ),
}));

import StorefrontPopup from '../components/holiday/StorefrontPopup';

const DURING_SALE = new Date('2026-11-20T12:00:00+08:00');
const AFTER_SALE = new Date('2027-01-02T12:00:00+08:00');

function setSettings(next: Partial<MockSettingsState>) {
  Object.assign(settingsState, { siteSettings: null, loading: false, error: null }, next);
}

describe('StorefrontPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DURING_SALE);
    setSettings({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows no popup while the settings are still loading', () => {
    setSettings({ loading: true });
    render(<StorefrontPopup />);
    expect(screen.queryByTestId('holiday-popup')).not.toBeInTheDocument();
    expect(screen.queryByTestId('welcome-popup')).not.toBeInTheDocument();
  });

  it('shows the holiday popup with the saved wording during the window', async () => {
    setSettings({ siteSettings: { holiday_popup_enabled: true, holiday_popup_title: 'Pasko na!' } });
    render(<StorefrontPopup />);
    expect(await screen.findByTestId('holiday-popup')).toHaveTextContent('Pasko na!');
    expect(screen.queryByTestId('welcome-popup')).not.toBeInTheDocument();
  });

  it('shows the welcome popup instead when the admin turned the holiday popup off', async () => {
    setSettings({ siteSettings: { holiday_popup_enabled: false } });
    render(<StorefrontPopup />);
    expect(await screen.findByTestId('welcome-popup')).toBeInTheDocument();
    expect(screen.queryByTestId('holiday-popup')).not.toBeInTheDocument();
  });

  it('shows the welcome popup outside the window the admin set', async () => {
    setSettings({
      siteSettings: {
        holiday_popup_start: '2026-12-01T00:00:00+08:00',
        holiday_popup_end: '2026-12-26T00:00:00+08:00',
      },
    });
    render(<StorefrontPopup />);
    expect(await screen.findByTestId('welcome-popup')).toBeInTheDocument();
  });

  it('falls back to the default copy and code window if settings fail to load', async () => {
    setSettings({ error: 'network down' });
    render(<StorefrontPopup />);
    expect(await screen.findByTestId('holiday-popup')).toHaveTextContent(/ber months/i);
  });

  it('falls back to the welcome popup after the code window when settings fail', async () => {
    vi.setSystemTime(AFTER_SALE);
    setSettings({ error: 'network down' });
    render(<StorefrontPopup />);
    expect(await screen.findByTestId('welcome-popup')).toBeInTheDocument();
  });
});
