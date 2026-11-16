import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('posthog-js', () => ({
  default: { capture: vi.fn() },
}));

import HolidayPopup, { HOLIDAY_POPUP_DELAY_MS } from '../components/holiday/HolidayPopup';
import { resolveHolidayPopupConfig, type HolidayPopupConfig } from '../lib/holidayPopupSettings';
import { HOLIDAY_SALE_HEADLINE_PCT } from '../lib/holidaySeason';
import type { SiteSettings } from '../types';

const DURING_SALE = new Date('2026-11-20T12:00:00+08:00');
const AFTER_SALE = new Date('2027-01-02T12:00:00+08:00');

const configFrom = (settings: Partial<SiteSettings> | null = null): HolidayPopupConfig =>
  resolveHolidayPopupConfig(settings);

function renderAndWait(config: HolidayPopupConfig = configFrom()) {
  const utils = render(<HolidayPopup config={config} />);
  act(() => {
    vi.advanceTimersByTime(HOLIDAY_POPUP_DELAY_MS);
  });
  return utils;
}

describe('HolidayPopup', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(DURING_SALE);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.getElementById('products')?.remove();
  });

  it('greets shoppers with the ber-months message during the sale', () => {
    renderAndWait();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(/ber months/i);
    expect(screen.getByText('Merry Christmas')).toBeInTheDocument();
    expect(screen.getByText(/small gift/i)).toBeInTheDocument();
    expect(screen.getByText(/till the year ends/i)).toBeInTheDocument();
    // Default offer line and big header figure follow the headline constant.
    expect(screen.getByText(new RegExp(`up to ${HOLIDAY_SALE_HEADLINE_PCT}% off`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(`${HOLIDAY_SALE_HEADLINE_PCT}%`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /shop now/i })).toBeInTheDocument();
  });

  it('announces QRPh as a new payment option by default', () => {
    renderAndWait();

    const note = within(screen.getByRole('dialog')).getByRole('note');
    expect(note).toHaveTextContent(/new payment option/i);
    expect(note).toHaveTextContent(
      'QRPh is now available — order now, pay later with selected banks.',
    );
  });

  it('shows the payment note the admin saved, as plain text', () => {
    renderAndWait(configFrom({ holiday_popup_payment_note: 'QRPh via <b>BPI</b> & BDO' }));

    expect(screen.getByRole('note')).toHaveTextContent('QRPh via <b>BPI</b> & BDO');
    expect(screen.getByRole('note').querySelector('b')).toBeNull();
    expect(screen.queryByText(/selected banks/i)).not.toBeInTheDocument();
  });

  it('hides the payment note when the admin switched it off', () => {
    renderAndWait(configFrom({ holiday_popup_payment_note_enabled: false }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/new payment option/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/qrph/i)).not.toBeInTheDocument();
  });

  it('waits before appearing so it does not block the first paint', () => {
    render(<HolidayPopup config={configFrom()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays hidden once the sale has ended', () => {
    vi.setSystemTime(AFTER_SALE);
    renderAndWait();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the wording the admin saved', () => {
    renderAndWait(
      configFrom({
        holiday_popup_eyebrow: 'Happy Holidays',
        holiday_popup_title: 'Pasko na!',
        holiday_popup_message: 'Thank you for a wonderful year.',
        holiday_popup_offer: 'Up to 30% off',
        holiday_popup_button_label: 'See the deals',
      }),
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Pasko na!');
    expect(screen.getByText('Happy Holidays')).toBeInTheDocument();
    expect(screen.getByText('Thank you for a wonderful year.')).toBeInTheDocument();
    expect(screen.getByText('Up to 30% off')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see the deals/i })).toBeInTheDocument();
    expect(screen.queryByText(/ber months/i)).not.toBeInTheDocument();
  });

  it('renders admin text as plain text, never as HTML', () => {
    renderAndWait(configFrom({ holiday_popup_title: '<img src=x onerror=alert(1)>Hi' }));

    expect(screen.getByRole('dialog')).toHaveAccessibleName('<img src=x onerror=alert(1)>Hi');
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('shows an offer without a percentage as a single headline', () => {
    renderAndWait(configFrom({ holiday_popup_offer: 'Buy 1 Take 1' }));
    expect(screen.getAllByText('Buy 1 Take 1')).toHaveLength(2);
  });

  it('stays hidden when the admin switched it off', () => {
    renderAndWait(configFrom({ holiday_popup_enabled: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays hidden outside the window the admin set', () => {
    renderAndWait(
      configFrom({
        holiday_popup_start: '2026-12-01T00:00:00+08:00',
        holiday_popup_end: '2026-12-26T00:00:00+08:00',
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes from the close button and does not reappear in the same session', () => {
    const { unmount } = renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    unmount();
    renderAndWait();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    renderAndWait();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('takes the shopper to the products when they tap Shop Now', () => {
    const products = document.createElement('section');
    products.id = 'products';
    const scrollIntoView = vi.fn();
    products.scrollIntoView = scrollIntoView;
    document.body.appendChild(products);

    renderAndWait();
    fireEvent.click(screen.getByRole('link', { name: /shop now/i }));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
