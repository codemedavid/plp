import React from 'react';

interface Props {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'good' | 'bad' | 'warn';
  hero?: boolean;
}

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-white border-gray-200 text-gray-900',
  good: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  bad: 'bg-rose-50 border-rose-200 text-rose-900',
  warn: 'bg-amber-50 border-amber-200 text-amber-900',
};

const MetricCard: React.FC<Props> = ({ label, value, sub, tone = 'default', hero }) => (
  <div
    className={`rounded-2xl border p-4 ${toneClasses[tone]} ${
      hero ? 'col-span-2 md:col-span-2' : ''
    }`}
  >
    <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
    <div className={`mt-1 font-bold ${hero ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'}`}>
      {value}
    </div>
    {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
  </div>
);

export default MetricCard;
