import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SiteSettings } from '../types';

const updateSiteSettings = vi.fn<(updates: Partial<SiteSettings>) => Promise<void>>();

const settingsState: { siteSettings: Partial<SiteSettings> | null; loading: boolean } = {
  siteSettings: null,
  loading: false,
};

vi.mock('../hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    siteSettings: settingsState.siteSettings,
    loading: settingsState.loading,
    error: null,
    updateSiteSettings,
  }),
}));

import HolidayPopupSettings from '../components/holiday/HolidayPopupSettings';

const savedSettings: Partial<SiteSettings> = {
  holiday_popup_enabled: true,
  holiday_popup_eyebrow: '',
  holiday_popup_title: 'Pasko na!',
  holiday_popup_message: '',
  holiday_popup_offer: '',
  holiday_popup_payment_note: '',
  holiday_popup_payment_note_enabled: true,
  holiday_popup_button_label: '',
  holiday_popup_start: '',
  holiday_popup_end: '',
};

function renderSettings(settings: Partial<SiteSettings> | null = savedSettings) {
  settingsState.siteSettings = settings;
  return render(<HolidayPopupSettings />);
}

const saveButton = () => screen.getByRole('button', { name: /save holiday popup/i });

describe('HolidayPopupSettings', () => {
  beforeEach(() => {
    updateSiteSettings.mockReset();
    updateSiteSettings.mockResolvedValue(undefined);
    settingsState.loading = false;
  });

  it('shows a clearly labelled Holiday Popup section prefilled from settings', () => {
    renderSettings();

    expect(screen.getByRole('heading', { name: /holiday popup/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^title/i)).toHaveValue('Pasko na!');
    // Empty fields show today's copy as the placeholder they fall back to.
    expect(screen.getByLabelText(/^eyebrow/i)).toHaveValue('');
    expect(screen.getByLabelText(/^eyebrow/i)).toHaveAttribute('placeholder', 'Merry Christmas');
    expect(screen.getByLabelText(/show the holiday popup/i)).toBeChecked();
    // Dates default to the code window, in Philippine time.
    expect(screen.getByLabelText(/starts/i)).toHaveValue('2026-11-01T00:00');
    expect(screen.getByLabelText(/ends/i)).toHaveValue('2027-01-01T00:00');
  });

  it('saves trimmed text, the on/off switch and the window through site settings', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.clear(screen.getByLabelText(/^title/i));
    await user.type(screen.getByLabelText(/^title/i), '  Maligayang Pasko!  ');
    await user.type(screen.getByLabelText(/^offer/i), 'Up to 30% off');
    await user.click(screen.getByLabelText(/show the holiday popup/i));
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2026-12-26T00:00' } });
    await user.click(saveButton());

    await waitFor(() => expect(updateSiteSettings).toHaveBeenCalledTimes(1));
    expect(updateSiteSettings).toHaveBeenCalledWith({
      holiday_popup_enabled: false,
      holiday_popup_eyebrow: '',
      holiday_popup_title: 'Maligayang Pasko!',
      holiday_popup_message: '',
      holiday_popup_offer: 'Up to 30% off',
      holiday_popup_payment_note: '',
      holiday_popup_payment_note_enabled: true,
      holiday_popup_button_label: '',
      holiday_popup_start: '2026-10-31T16:00:00.000Z',
      holiday_popup_end: '2026-12-25T16:00:00.000Z',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i);
  });

  it('blocks saving when the end is not after the start', async () => {
    const user = userEvent.setup();
    renderSettings();

    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: '2026-10-01T00:00' } });
    await user.click(saveButton());

    expect(screen.getByText(/end must be after the start/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ends/i)).toHaveAttribute('aria-invalid', 'true');
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it('blocks saving text that is too long', async () => {
    const user = userEvent.setup();
    renderSettings();

    // fireEvent bypasses the input's maxLength, like a pasted value would in an old browser.
    fireEvent.change(screen.getByLabelText(/^button label/i), { target: { value: 'x'.repeat(200) } });
    await user.click(saveButton());

    expect(screen.getByText(/characters or fewer/i)).toBeInTheDocument();
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it('shows the payment note field with the default as placeholder and a character counter', () => {
    renderSettings();

    const note = screen.getByLabelText(/^payment note/i);
    expect(note).toHaveValue('');
    expect(note).toHaveAttribute(
      'placeholder',
      'QRPh is now available — order now, pay later with selected banks.',
    );
    expect(note).toHaveAttribute('maxLength', '140');
    expect(screen.getByText('0/140')).toBeInTheDocument();
    expect(screen.getByLabelText(/show the payment note/i)).toBeChecked();
  });

  it('saves the payment note text and its on/off switch', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText(/^payment note/i), '  QRPh with BPI & BDO  ');
    await user.click(screen.getByLabelText(/show the payment note/i));
    await user.click(saveButton());

    await waitFor(() => expect(updateSiteSettings).toHaveBeenCalledTimes(1));
    expect(updateSiteSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        holiday_popup_payment_note: 'QRPh with BPI & BDO',
        holiday_popup_payment_note_enabled: false,
      }),
    );
  });

  it('blocks saving a payment note that is too long', async () => {
    const user = userEvent.setup();
    renderSettings();

    fireEvent.change(screen.getByLabelText(/^payment note/i), { target: { value: 'x'.repeat(141) } });
    await user.click(saveButton());

    expect(screen.getByText(/140 characters or fewer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^payment note/i)).toHaveAttribute('aria-invalid', 'true');
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it('previews the payment note and hides it when switched off', async () => {
    const user = userEvent.setup();
    renderSettings();

    const preview = screen.getByRole('region', { name: /preview/i });
    expect(within(preview).getByRole('note')).toHaveTextContent(/selected banks/i);

    await user.type(screen.getByLabelText(/^payment note/i), 'Pay later via QRPh');
    expect(within(preview).getByRole('note')).toHaveTextContent('Pay later via QRPh');

    await user.click(screen.getByLabelText(/show the payment note/i));
    expect(within(preview).queryByRole('note')).not.toBeInTheDocument();
  });

  it('tells the admin when saving fails', async () => {
    updateSiteSettings.mockRejectedValueOnce(new Error('denied'));
    const user = userEvent.setup();
    renderSettings();

    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
  });

  it('previews the popup with typed text and falls back to the default copy', async () => {
    const user = userEvent.setup();
    renderSettings();

    const preview = screen.getByRole('region', { name: /preview/i });
    expect(within(preview).getByText('Pasko na!')).toBeInTheDocument();
    expect(within(preview).getByText('Merry Christmas')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^eyebrow/i), 'Happy Holidays');
    expect(within(preview).getByText('Happy Holidays')).toBeInTheDocument();
  });

  it('works with no saved settings at all', () => {
    renderSettings(null);
    expect(screen.getByLabelText(/^title/i)).toHaveValue('');
    expect(screen.getByLabelText(/starts/i)).toHaveValue('2026-11-01T00:00');
  });
});
