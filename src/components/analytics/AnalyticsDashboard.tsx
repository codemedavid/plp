import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import DateRangeFilter from './DateRangeFilter';
import AnalyticsTabs, { TabId } from './AnalyticsTabs';
import SalesProfitTab from './tabs/SalesProfitTab';
import PayoutLiabilityTab from './tabs/PayoutLiabilityTab';
import ProductProfitTab from './tabs/ProductProfitTab';
import ReferralTab from './tabs/ReferralTab';
import NetworkTreeTab from './tabs/NetworkTreeTab';
import CustomersTab from './tabs/CustomersTab';
import { defaultRange, useAnalytics } from './useAnalytics';

interface Props {
  onBack: () => void;
}

const AnalyticsDashboard: React.FC<Props> = ({ onBack }) => {
  const [tab, setTab] = useState<TabId>('sales');
  const [range, setRange] = useState(defaultRange());
  const {
    sales,
    profitMonthly,
    liability,
    products,
    referrers,
    networkLevels,
    funnel,
    customers,
    payoutDetails,
    config,
    loading,
    error,
  } = useAnalytics(range);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="mb-4 text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">
              Sales, profit, and referral liability — frozen accounts excluded.
            </p>
          </div>
          <DateRangeFilter range={range} onChange={setRange} />
        </div>

        <AnalyticsTabs active={tab} onSelect={setTab} />

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : (
          <>
            {tab === 'sales' && <SalesProfitTab sales={sales} profitMonthly={profitMonthly} />}
            {tab === 'referral' && <ReferralTab referrers={referrers} funnel={funnel} />}
            {tab === 'network' && (
              <NetworkTreeTab referrers={referrers} networkLevels={networkLevels} />
            )}
            {tab === 'customers' && <CustomersTab customers={customers} />}
            {tab === 'payout' && (
              <PayoutLiabilityTab
                liability={liability}
                profitMonthly={profitMonthly}
                payoutDetails={payoutDetails}
                config={config}
              />
            )}
            {tab === 'product' && <ProductProfitTab products={products} />}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
