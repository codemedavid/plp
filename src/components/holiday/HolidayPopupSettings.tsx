import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Gift } from 'lucide-react';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import {
  HOLIDAY_POPUP_DEFAULT_COPY,
  HOLIDAY_POPUP_MAX_LENGTH,
  fromPhilippineDateTimeInput,
  resolveHolidayPopupConfig,
  toHolidayPopupFormValues,
  validateHolidayPopupForm,
  type HolidayPopupCopy,
  type HolidayPopupFormErrors,
  type HolidayPopupFormValues,
} from '../../lib/holidayPopupSettings';
import HolidayPopupCard from './HolidayPopupCard';

type CopyField = keyof HolidayPopupCopy;
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface TextFieldSpec {
  field: CopyField;
  label: string;
  multiline?: boolean;
}

// Listed in the order they appear on the card; the payment note sits between
// the offer line and the button.
const HEADLINE_FIELDS: ReadonlyArray<TextFieldSpec> = [
  { field: 'eyebrow', label: 'Eyebrow' },
  { field: 'title', label: 'Title' },
  { field: 'message', label: 'Message', multiline: true },
  { field: 'offer', label: 'Offer line' },
];
const PAYMENT_NOTE_FIELD: TextFieldSpec = { field: 'paymentNote', label: 'Payment note', multiline: true };
const BUTTON_FIELD: TextFieldSpec = { field: 'buttonLabel', label: 'Button label' };

const INPUT_CLASS =
  'w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all';

const inputClass = (hasError: boolean): string =>
  `${INPUT_CLASS} ${hasError ? 'border-red-400' : 'border-gray-200'}`;

// One-line status so the owner can tell at a glance what shoppers see now.
function scheduleStatus(values: HolidayPopupFormValues, now: Date = new Date()): string {
  if (!values.enabled) return 'Off — shoppers see the regular welcome popup.';
  const start = fromPhilippineDateTimeInput(values.start);
  const end = fromPhilippineDateTimeInput(values.end);
  if (!start || !end || end <= start) return 'Check the dates below.';
  if (now < start) return 'Scheduled — not showing yet.';
  if (now >= end) return 'Ended — shoppers see the regular welcome popup.';
  return 'Showing to shoppers now.';
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-red-600">
      {message}
    </p>
  );
}

interface CopyTextFieldProps extends TextFieldSpec {
  value: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

function CopyTextField({ field, label, multiline, value, error, onChange }: CopyTextFieldProps) {
  const id = `holiday-popup-${field}`;
  const errorId = `${id}-error`;
  const maxLength = HOLIDAY_POPUP_MAX_LENGTH[field];
  const shared = {
    id,
    name: field,
    value,
    onChange,
    maxLength,
    placeholder: HOLIDAY_POPUP_DEFAULT_COPY[field],
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: inputClass(Boolean(error)),
  };
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label htmlFor={id} className="block text-sm font-bold text-gray-700">
          {label}
        </label>
        <span className="text-xs tabular-nums text-gray-400" aria-hidden="true">
          {value.length}/{maxLength}
        </span>
      </div>
      {multiline ? <textarea rows={3} {...shared} className={`${shared.className} resize-none`} /> : <input type="text" {...shared} />}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export default function HolidayPopupSettings() {
  const { siteSettings, loading, updateSiteSettings } = useSiteSettings();
  const [values, setValues] = useState<HolidayPopupFormValues>(() => toHolidayPopupFormValues(siteSettings));
  const [errors, setErrors] = useState<HolidayPopupFormErrors>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    setValues(toHolidayPopupFormValues(siteSettings));
  }, [siteSettings]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const nextValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;
    setValues((prev) => ({ ...prev, [name]: nextValue }));
    setSaveState('idle');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateHolidayPopupForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaveState('saving');
    try {
      await updateSiteSettings(result.updates);
      setSaveState('saved');
    } catch (error) {
      console.error('Error saving holiday popup settings:', error);
      setSaveState('failed');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading holiday popup…</div>;
  }

  // Preview what shoppers would see: blank fields fall back to the default copy.
  const preview = resolveHolidayPopupConfig({
    holiday_popup_eyebrow: values.eyebrow,
    holiday_popup_title: values.title,
    holiday_popup_message: values.message,
    holiday_popup_offer: values.offer,
    holiday_popup_payment_note: values.paymentNote,
    holiday_popup_payment_note_enabled: values.paymentNoteEnabled,
    holiday_popup_button_label: values.buttonLabel,
  });

  const renderTextField = (spec: TextFieldSpec) => (
    <CopyTextField
      key={spec.field}
      {...spec}
      value={values[spec.field]}
      error={errors[spec.field]}
      onChange={handleChange}
    />
  );

  return (
    <section
      aria-labelledby="holiday-popup-settings-heading"
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <form onSubmit={handleSubmit} noValidate>
        <header className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Gift className="w-6 h-6 text-red-700" aria-hidden="true" />
            </div>
            <div>
              <h2 id="holiday-popup-settings-heading" className="text-xl font-bold text-gray-900">
                Holiday Popup
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                The Christmas popup shoppers see on the homepage. Leave a field empty to use the default wording.
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={saveState === 'saving'}
            className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saveState === 'saving' ? 'Saving…' : 'Save Holiday Popup'}
          </button>
        </header>

        <div className="p-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={values.enabled}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 accent-navy-900"
                />
                <span className="block text-sm font-medium text-gray-800">Show the holiday popup</span>
              </label>
              <p className="text-xs text-gray-500 mt-1.5 pl-7">{scheduleStatus(values)}</p>
            </div>

            {HEADLINE_FIELDS.map(renderTextField)}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="paymentNoteEnabled"
                    checked={values.paymentNoteEnabled}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 accent-navy-900"
                  />
                  <span className="block text-sm font-medium text-gray-800">Show the payment note</span>
                </label>
                <p className="text-xs text-gray-500 mt-1.5 pl-7">
                  A small “New payment option” line above the button. Turn it off to hide it.
                </p>
              </div>
              {renderTextField(PAYMENT_NOTE_FIELD)}
            </div>

            {renderTextField(BUTTON_FIELD)}

            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <legend className="mb-2 text-sm font-bold text-gray-700">When it shows (Philippine time)</legend>
              {(['start', 'end'] as const).map((field) => {
                const id = `holiday-popup-${field}`;
                const errorId = `${id}-error`;
                return (
                  <div key={field}>
                    <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1.5">
                      {field === 'start' ? 'Starts (PH time)' : 'Ends (PH time, not included)'}
                    </label>
                    <input
                      id={id}
                      type="datetime-local"
                      name={field}
                      value={values[field]}
                      onChange={handleChange}
                      aria-invalid={errors[field] ? true : undefined}
                      aria-describedby={errors[field] ? errorId : undefined}
                      className={inputClass(Boolean(errors[field]))}
                    />
                    <FieldError id={errorId} message={errors[field]} />
                  </div>
                );
              })}
            </fieldset>

            {saveState === 'saved' && (
              <p role="status" className="text-sm font-medium text-green-700">Holiday popup saved.</p>
            )}
            {saveState === 'failed' && (
              <p role="alert" className="text-sm font-medium text-red-600">
                Couldn’t save the holiday popup — please try again.
              </p>
            )}
          </div>

          <section aria-label="Preview" className="rounded-xl bg-navy-900/80 p-4 sm:p-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-cream-light/70">Preview</p>
            <div className="flex justify-center">
              <HolidayPopupCard copy={preview} titleId="holiday-popup-preview-title" />
            </div>
          </section>
        </div>
      </form>
    </section>
  );
}
