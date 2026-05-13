import React from 'react';
import MetricCard from '../MetricCard';
import TrendChart from '../TrendChart';
import ExportButton from '../ExportButton';
import { NetProfitMonth, SalesDay, formatPeso, formatPct } from '../useAnalytics';

interface Props {
  sales: SalesDay[];
  profitMonthly: NetProfitMonth[];
}

const SalesProfitTab: React.FC<Props> = ({ sales, profitMonthly }) => {
  const totals = sales.reduce(
    (acc, d) => ({
      gross: acc.gross + Number(d.gross_revenue),
      net: acc.net + Number(d.net_revenue),
      cost: acc.cost + Number(d.total_cost),
      orders: acc.orders + Number(d.orders_count),
      redeemed: acc.redeemed + Number(d.points_redeemed),
    }),
    { gross: 0, net: 0, cost: 0, orders: 0, redeemed: 0 }
  );
  const payoutInRange = profitMonthly.reduce((a, m) => a + Number(m.referral_payout), 0);
  const netProfit = totals.net - totals.cost - payoutInRange;
  const aov = totals.orders ? totals.gross / totals.orders : 0;
  const margin = totals.gross ? netProfit / totals.gross : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <ExportButton
          filename="sales_daily.csv"
          rows={sales as unknown as Record<string, unknown>[]}
          label="Export daily sales"
        />
        <ExportButton
          filename="profit_monthly.csv"
          rows={profitMonthly as unknown as Record<string, unknown>[]}
          label="Export monthly profit"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Net Profit (after payouts)"
          value={formatPeso(netProfit)}
          sub={`${formatPct(margin)} margin`}
          tone={netProfit >= 0 ? 'good' : 'bad'}
          hero
        />
        <MetricCard label="Gross Revenue" value={formatPeso(totals.gross)} />
        <MetricCard label="Net Revenue" value={formatPeso(totals.net)} sub="after points redeemed" />
        <MetricCard label="Cost of Goods" value={formatPeso(totals.cost)} />
        <MetricCard label="Referral Payouts" value={formatPeso(payoutInRange)} tone="warn" />
        <MetricCard label="Orders" value={totals.orders.toLocaleString()} />
        <MetricCard label="AOV" value={formatPeso(aov)} />
        <MetricCard label="Points Redeemed" value={formatPeso(totals.redeemed)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Daily revenue vs cost</h3>
        <TrendChart
          labels={sales.map(s => s.day)}
          series={[
            { label: 'Gross', color: '#10b981', values: sales.map(s => Number(s.gross_revenue)) },
            { label: 'Cost', color: '#f43f5e', values: sales.map(s => Number(s.total_cost)) },
          ]}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Monthly net profit</h3>
        <TrendChart
          labels={profitMonthly.map(m => m.month)}
          series={[
            {
              label: 'Net profit',
              color: '#6366f1',
              values: profitMonthly.map(m => Number(m.net_profit)),
            },
            {
              label: 'Referral payout',
              color: '#f59e0b',
              values: profitMonthly.map(m => Number(m.referral_payout)),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default SalesProfitTab;
