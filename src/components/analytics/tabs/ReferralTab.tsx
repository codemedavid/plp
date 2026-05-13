import React from 'react';
import { Trophy } from 'lucide-react';
import MetricCard from '../MetricCard';
import ExportButton from '../ExportButton';
import {
  Funnel,
  ReferrerStat,
  formatPeso,
  formatPct,
} from '../useAnalytics';

interface Props {
  referrers: ReferrerStat[];
  funnel: Funnel | null;
}

const ReferralTab: React.FC<Props> = ({ referrers, funnel }) => {
  const activeReferrers = referrers.filter(r => r.network_orders > 0).length;
  const totalRevenue = referrers.reduce((a, r) => a + Number(r.network_revenue), 0);
  const totalPoints = referrers.reduce((a, r) => a + Number(r.points_earned), 0);
  const totalInvitees = referrers.reduce((a, r) => a + r.direct_invitees, 0);

  // Funnel %s
  const signupToOrder = funnel && funnel.signups
    ? funnel.signups_with_order / funnel.signups
    : 0;
  const referredConversion = funnel && funnel.referred_signups
    ? funnel.referred_with_order / funnel.referred_signups
    : 0;
  const repeatRate = funnel && funnel.signups_with_order
    ? funnel.repeat_buyers / funnel.signups_with_order
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <ExportButton
          filename="referrers.csv"
          rows={referrers as unknown as Record<string, unknown>[]}
          label="Export referrer list"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Invitees" value={totalInvitees.toLocaleString()} />
        <MetricCard label="Active Referrers" value={activeReferrers.toLocaleString()} sub="≥1 buyer in network" />
        <MetricCard label="Referral Revenue" value={formatPeso(totalRevenue)} tone="good" />
        <MetricCard label="Total Points Paid" value={formatPeso(totalPoints)} tone="warn" />
      </div>

      {/* Funnel */}
      {funnel && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Signup → Purchase Funnel</h3>
          <FunnelBars funnel={funnel} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <MetricCard
              label="Signup → Order"
              value={formatPct(signupToOrder)}
              sub={`${funnel.signups_with_order}/${funnel.signups}`}
            />
            <MetricCard
              label="Referred Conversion"
              value={formatPct(referredConversion)}
              sub={`${funnel.referred_with_order}/${funnel.referred_signups}`}
              tone={referredConversion > signupToOrder ? 'good' : 'default'}
            />
            <MetricCard
              label="Repeat Rate"
              value={formatPct(repeatRate)}
              sub={`${funnel.repeat_buyers} repeat buyers`}
            />
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Top Referrers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Referrer</th>
                <th className="text-right px-4 py-2">Direct</th>
                <th className="text-right px-4 py-2">Network</th>
                <th className="text-right px-4 py-2">Orders</th>
                <th className="text-right px-4 py-2">Revenue</th>
                <th className="text-right px-4 py-2">Earned</th>
                <th className="text-right px-4 py-2">ROI</th>
              </tr>
            </thead>
            <tbody>
              {referrers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No referrers yet.
                  </td>
                </tr>
              )}
              {referrers.slice(0, 25).map((r, i) => (
                <tr key={r.inviter_id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">
                      {r.full_name || '(no name)'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{r.referral_code}</div>
                  </td>
                  <td className="px-4 py-2 text-right">{r.direct_invitees}</td>
                  <td className="px-4 py-2 text-right">{r.total_network}</td>
                  <td className="px-4 py-2 text-right">{r.network_orders}</td>
                  <td className="px-4 py-2 text-right">{formatPeso(Number(r.network_revenue))}</td>
                  <td className="px-4 py-2 text-right text-amber-700">
                    {formatPeso(Number(r.points_earned))}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {Number(r.roi).toFixed(1)}×
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FunnelBars: React.FC<{ funnel: Funnel }> = ({ funnel }) => {
  const max = Math.max(funnel.signups, 1);
  const steps = [
    { label: 'Signups', value: funnel.signups, color: 'bg-indigo-500' },
    {
      label: 'Used referral code',
      value: funnel.referred_signups,
      color: 'bg-emerald-500',
    },
    {
      label: 'Placed first order',
      value: funnel.signups_with_order,
      color: 'bg-amber-500',
    },
    { label: 'Repeat buyers', value: funnel.repeat_buyers, color: 'bg-rose-500' },
  ];
  return (
    <div className="space-y-2">
      {steps.map(s => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="w-36 text-xs text-gray-600 shrink-0">{s.label}</div>
          <div className="flex-1 bg-gray-100 rounded h-6 overflow-hidden">
            <div
              className={`${s.color} h-full transition-all`}
              style={{ width: `${(s.value / max) * 100}%` }}
            />
          </div>
          <div className="w-20 text-right text-sm font-medium text-gray-900 tabular-nums">
            {s.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReferralTab;
