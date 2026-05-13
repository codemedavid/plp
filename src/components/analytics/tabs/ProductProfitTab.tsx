import React from 'react';
import { ProductProfit, formatPeso } from '../useAnalytics';

interface Props {
  products: ProductProfit[];
}

const ProductProfitTab: React.FC<Props> = ({ products }) => {
  const sorted = [...products].sort((a, b) => Number(b.real_profit) - Number(a.real_profit));
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Per-product profitability</h3>
        <span className="text-xs text-gray-500">
          Real profit = revenue − cost − allocated referral payout
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Product</th>
              <th className="text-right px-4 py-2">Units</th>
              <th className="text-right px-4 py-2">Revenue</th>
              <th className="text-right px-4 py-2">Cost</th>
              <th className="text-right px-4 py-2">Referral payout</th>
              <th className="text-right px-4 py-2">Real profit</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No sales yet, or product cost not set.
                </td>
              </tr>
            )}
            {sorted.map(p => {
              const profit = Number(p.real_profit);
              return (
                <tr key={p.product_id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-900">{p.product_name}</td>
                  <td className="px-4 py-2 text-right">{Number(p.units_sold).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{formatPeso(Number(p.gross_revenue))}</td>
                  <td className="px-4 py-2 text-right text-rose-700">
                    {formatPeso(Number(p.total_cost))}
                  </td>
                  <td className="px-4 py-2 text-right text-amber-700">
                    {formatPeso(Number(p.referral_payout))}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatPeso(profit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductProfitTab;
