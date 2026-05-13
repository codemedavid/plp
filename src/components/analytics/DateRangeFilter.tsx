import React from 'react';
import { DateRange } from './useAnalytics';

interface Props {
  range: DateRange;
  onChange: (range: DateRange) => void;
}

const presets: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '12m', days: 365 },
];

const DateRangeFilter: React.FC<Props> = ({ range, onChange }) => {
  const setPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    onChange({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => setPreset(p.days)}
            className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-white rounded-md transition"
          >
            {p.label}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={range.from}
        onChange={e => onChange({ ...range, from: e.target.value })}
        className="px-2 py-1 text-sm border border-gray-200 rounded-md"
      />
      <span className="text-gray-400 text-sm">→</span>
      <input
        type="date"
        value={range.to}
        onChange={e => onChange({ ...range, to: e.target.value })}
        className="px-2 py-1 text-sm border border-gray-200 rounded-md"
      />
    </div>
  );
};

export default DateRangeFilter;
