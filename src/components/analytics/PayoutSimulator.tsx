import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { PayoutDetail, formatPeso } from './useAnalytics';

interface Props {
  payouts: PayoutDetail[];
  // Current config (read from referral_config or hard-coded defaults)
  current: { l1: number; l2: number; l3: number };
  onClose: () => void;
}

const PayoutSimulator: React.FC<Props> = ({ payouts, current, onClose }) => {
  const [l1, setL1] = useState(current.l1);
  const [l2, setL2] = useState(current.l2);
  const [l3, setL3] = useState(current.l3);

  const summary = useMemo(() => {
    // Group actual paid points by (month, level). Then scale each row by
    // newRate/oldRate where oldRate is the configured rate when it was paid.
    // We don't track historical rates, so we assume each row was paid at the
    // current rate — fine for "what if I change rates going forward".
    const byMonth = new Map<string, { actual: number; simulated: number }>();
    for (const p of payouts) {
      const rate = p.level === 1 ? current.l1 : p.level === 2 ? current.l2 : current.l3;
      const newRate = p.level === 1 ? l1 : p.level === 2 ? l2 : l3;
      if (rate === 0) continue;
      const orderCount = p.points / rate; // back out qualifying-order count
      const simulated = orderCount * newRate;
      const key = (p.month ?? 'unknown').slice(0, 7);
      const cur = byMonth.get(key) ?? { actual: 0, simulated: 0 };
      cur.actual += p.points;
      cur.simulated += simulated;
      byMonth.set(key, cur);
    }
    const months = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-3);
    const totals = months.reduce(
      (acc, [, v]) => ({
        actual: acc.actual + v.actual,
        simulated: acc.simulated + v.simulated,
      }),
      { actual: 0, simulated: 0 }
    );
    return { months, totals };
  }, [payouts, current, l1, l2, l3]);

  const delta = summary.totals.simulated - summary.totals.actual;
  const deltaPct = summary.totals.actual
    ? delta / summary.totals.actual
    : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Payout Simulator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            Rerun the last 3 months of referral payouts at hypothetical rates. Assumes past
            payouts were paid at the <strong>current</strong> rates (we don't store historical
            rate changes).
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['L1', l1, setL1, current.l1],
                ['L2', l2, setL2, current.l2],
                ['L3', l3, setL3, current.l3],
              ] as const
            ).map(([label, v, set, cur]) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {label} (current {cur})
                </label>
                <input
                  type="number"
                  value={v}
                  onChange={e => set(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            ))}
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Month</th>
                <th className="text-right px-3 py-2">Actual paid</th>
                <th className="text-right px-3 py-2">Simulated</th>
                <th className="text-right px-3 py-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {summary.months.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    No payout history yet.
                  </td>
                </tr>
              )}
              {summary.months.map(([month, v]) => {
                const d = v.simulated - v.actual;
                return (
                  <tr key={month} className="border-t border-gray-100">
                    <td className="px-3 py-2">{month}</td>
                    <td className="px-3 py-2 text-right">{formatPeso(v.actual)}</td>
                    <td className="px-3 py-2 text-right">{formatPeso(v.simulated)}</td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${
                        d > 0 ? 'text-rose-700' : d < 0 ? 'text-emerald-700' : 'text-gray-600'
                      }`}
                    >
                      {d > 0 ? '+' : ''}
                      {formatPeso(d)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">{formatPeso(summary.totals.actual)}</td>
                <td className="px-3 py-2 text-right">{formatPeso(summary.totals.simulated)}</td>
                <td
                  className={`px-3 py-2 text-right ${
                    delta > 0 ? 'text-rose-700' : delta < 0 ? 'text-emerald-700' : 'text-gray-600'
                  }`}
                >
                  {delta > 0 ? '+' : ''}
                  {formatPeso(delta)} ({(deltaPct * 100).toFixed(1)}%)
                </td>
              </tr>
            </tfoot>
          </table>

          <p className="text-xs text-gray-500">
            This is a preview only — nothing is written. Change actual rates in the Referrals
            admin section.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayoutSimulator;
