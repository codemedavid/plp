import React from 'react';

interface Series {
  label: string;
  color: string;
  values: number[];
}

interface Props {
  labels: string[];
  series: Series[];
  height?: number;
}

const TrendChart: React.FC<Props> = ({ labels, series, height = 160 }) => {
  const width = 600;
  const pad = 24;
  const all = series.flatMap(s => s.values);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const range = max - min || 1;
  const n = labels.length;
  const xStep = n > 1 ? (width - pad * 2) / (n - 1) : 0;

  const toY = (v: number) =>
    height - pad - ((v - min) / range) * (height - pad * 2);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        {/* grid baseline */}
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="#e5e7eb" />
        {series.map(s => {
          if (s.values.length === 0) return null;
          const d = s.values
            .map((v, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * xStep} ${toY(v)}`)
            .join(' ');
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} />
              {s.values.map((v, i) => (
                <circle key={i} cx={pad + i * xStep} cy={toY(v)} r={2.5} fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 flex-wrap mt-2 text-xs text-gray-600">
        {series.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendChart;
