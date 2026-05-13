import React from 'react';
import MetricCard from '../MetricCard';
import ExportButton from '../ExportButton';
import { CustomerLTV, formatPeso, formatPct } from '../useAnalytics';

interface Props {
  customers: CustomerLTV[];
}

const CustomersTab: React.FC<Props> = ({ customers }) => {
  const buyers = customers.filter(c => c.orders > 0);
  const newBuyers = buyers.filter(c => c.orders === 1);
  const returning = buyers.filter(c => c.orders > 1);
  const referred = buyers.filter(c => c.is_referred);
  const organic = buyers.filter(c => !c.is_referred);

  const totalSpent = buyers.reduce((a, c) => a + Number(c.gross_spent), 0);
  const ltv = buyers.length ? totalSpent / buyers.length : 0;
  const referredLtv = referred.length
    ? referred.reduce((a, c) => a + Number(c.gross_spent), 0) / referred.length
    : 0;
  const organicLtv = organic.length
    ? organic.reduce((a, c) => a + Number(c.gross_spent), 0) / organic.length
    : 0;
  const repeatRate = buyers.length ? returning.length / buyers.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Customers" value={buyers.length.toLocaleString()} />
        <MetricCard
          label="Avg LTV"
          value={formatPeso(ltv)}
          sub="gross spend / buyer"
          hero
        />
        <MetricCard
          label="New / Returning"
          value={`${newBuyers.length} / ${returning.length}`}
          sub={`${formatPct(repeatRate)} repeat`}
        />
        <MetricCard
          label="Referred vs Organic"
          value={`${referred.length} / ${organic.length}`}
          sub={`buyers split`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MetricCard
          label="Referred-buyer LTV"
          value={formatPeso(referredLtv)}
          tone={referredLtv > organicLtv ? 'good' : 'default'}
          sub={referredLtv > organicLtv ? 'higher than organic ✓' : 'below organic'}
        />
        <MetricCard
          label="Organic-buyer LTV"
          value={formatPeso(organicLtv)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Top customers by spend</h3>
          <ExportButton
            filename="customers_ltv.csv"
            rows={customers as unknown as Record<string, unknown>[]}
            label="Export all"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Customer</th>
                <th className="text-left px-4 py-2">Source</th>
                <th className="text-right px-4 py-2">Orders</th>
                <th className="text-right px-4 py-2">Gross spend</th>
                <th className="text-right px-4 py-2">Pts earned</th>
                <th className="text-right px-4 py-2">Pts redeemed</th>
              </tr>
            </thead>
            <tbody>
              {buyers.slice(0, 50).map(c => (
                <tr key={c.user_id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{c.full_name || '(no name)'}</div>
                    <div className="text-xs text-gray-500 font-mono">{c.referral_code}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        c.is_referred
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.is_referred ? 'referred' : 'organic'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{c.orders}</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {formatPeso(Number(c.gross_spent))}
                  </td>
                  <td className="px-4 py-2 text-right text-amber-700">
                    {formatPeso(Number(c.points_earned))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatPeso(Number(c.points_redeemed))}
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

export default CustomersTab;
