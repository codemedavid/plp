import React from 'react';
import { BarChart3, Coins, Package, Share2, Network, UserCircle } from 'lucide-react';

export type TabId = 'sales' | 'referral' | 'network' | 'payout' | 'product' | 'customers';

export const ANALYTICS_TABS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'sales', label: 'Sales & Profit', icon: BarChart3 },
  { id: 'referral', label: 'Referrals', icon: Share2 },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'customers', label: 'Customers', icon: UserCircle },
  { id: 'payout', label: 'Payout & Liability', icon: Coins },
  { id: 'product', label: 'Product Profit', icon: Package },
];

type Props = {
  active: TabId;
  onSelect: (id: TabId) => void;
};

export default function AnalyticsTabs({ active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Analytics sections"
      className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-4 max-w-full overflow-x-auto"
    >
      {ANALYTICS_TABS.map(t => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(t.id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
