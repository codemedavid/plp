import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import MetricCard from '../MetricCard';
import TrendChart from '../TrendChart';
import ExportButton from '../ExportButton';
import PayoutSimulator from '../PayoutSimulator';
import {
  NetProfitMonth,
  PayoutDetail,
  PointsLiability,
  ReferralConfig,
  formatPeso,
  formatPct,
} from '../useAnalytics';

interface Props {
  liability: PointsLiability | null;
  profitMonthly: NetProfitMonth[];
  payoutDetails: PayoutDetail[];
  config: ReferralConfig | null;
}

const PayoutLiabilityTab: React.FC<Props> = ({
  liability,
  profitMonthly,
  payoutDetails,
  config,
}) => {
  const [simOpen, setSimOpen] = useState(false);
  if (!liability) return <div className="text-sm text-gray-500">Loading liability…</div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <ExportButton
          filename="referral_payouts.csv"
          rows={payoutDetails as unknown as Record<string, unknown>[]}
          label="Export payouts"
        />
        <ExportButton
          filename="profit_after_payouts.csv"
          rows={profitMonthly as unknown as Record<string, unknown>[]}
          label="Export profit"
        />
        <button
          onClick={() => setSimOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition"
        >
          <Calculator className="w-3.5 h-3.5" />
          Simulate payout change
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Outstanding Liability"
          value={formatPeso(liability.outstanding)}
          sub="unredeemed points (= ₱ owed)"
          tone="warn"
          hero
        />
        <MetricCard label="Points Issued" value={formatPeso(liability.points_issued)} />
        <MetricCard label="Points Redeemed" value={formatPeso(liability.points_redeemed)} />
        <MetricCard
          label="Burn Ratio"
          value={formatPct(liability.burn_ratio)}
          sub="redeemed ÷ issued"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Referral payouts by month
        </h3>
        <TrendChart
          labels={profitMonthly.map(m => m.month)}
          series={[
            {
              label: 'Referral payout (₱)',
              color: '#f59e0b',
              values: profitMonthly.map(m => Number(m.referral_payout)),
            },
          ]}
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
        <strong>What this means:</strong> outstanding points are a real liability — every
        unredeemed point can be cashed out at ₱1. Watch the burn ratio: very low means points
        are piling up; very high means users are extracting cash quickly.
      </div>

      {simOpen && (
        <PayoutSimulator
          payouts={payoutDetails}
          current={{
            l1: config?.l1_points ?? 500,
            l2: config?.l2_points ?? 150,
            l3: config?.l3_points ?? 50,
          }}
          onClose={() => setSimOpen(false)}
        />
      )}
    </div>
  );
};

export default PayoutLiabilityTab;
