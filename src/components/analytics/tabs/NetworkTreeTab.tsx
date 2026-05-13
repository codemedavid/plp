import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NetworkLevel, ReferrerStat, formatPeso } from '../useAnalytics';

interface Props {
  referrers: ReferrerStat[];
  networkLevels: NetworkLevel[];
}

const NetworkTreeTab: React.FC<Props> = ({ referrers, networkLevels }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const byInviter = useMemo(() => {
    const m = new Map<string, NetworkLevel[]>();
    for (const nl of networkLevels) {
      if (!m.has(nl.inviter_id)) m.set(nl.inviter_id, []);
      m.get(nl.inviter_id)!.push(nl);
    }
    return m;
  }, [networkLevels]);

  // Power-node score: revenue weighted to deeper levels
  const ranked = useMemo(() => {
    return [...referrers].sort(
      (a, b) => Number(b.network_revenue) - Number(a.network_revenue)
    );
  }, [referrers]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Network — L1 / L2 / L3 breakdown</h3>
        <span className="text-xs text-gray-500">
          Click a row to expand levels
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {ranked.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No network data yet.
          </div>
        )}
        {ranked.slice(0, 50).map(r => {
          const isOpen = expanded.has(r.inviter_id);
          const levels = byInviter.get(r.inviter_id) ?? [];
          const byLevel = (lvl: 1 | 2 | 3) => levels.find(l => l.level === lvl);
          return (
            <div key={r.inviter_id}>
              <button
                onClick={() => toggle(r.inviter_id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition text-left"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {r.full_name || '(no name)'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{r.referral_code}</div>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-semibold text-gray-900">{r.total_network}</span>{' '}
                    invitees
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      {formatPeso(Number(r.network_revenue))}
                    </span>{' '}
                    revenue
                  </div>
                  <div className="text-amber-700">
                    {formatPeso(Number(r.points_earned))} paid
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="bg-gray-50 px-4 py-3">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-gray-500">
                      <tr>
                        <th className="text-left py-1">Level</th>
                        <th className="text-right py-1">Invitees</th>
                        <th className="text-right py-1">Orders</th>
                        <th className="text-right py-1">Revenue</th>
                        <th className="text-right py-1">Points paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([1, 2, 3] as const).map(lvl => {
                        const row = byLevel(lvl);
                        return (
                          <tr key={lvl} className="border-t border-gray-200">
                            <td className="py-1.5 font-medium">L{lvl}</td>
                            <td className="py-1.5 text-right">{row?.invitees ?? 0}</td>
                            <td className="py-1.5 text-right">{row?.orders ?? 0}</td>
                            <td className="py-1.5 text-right">
                              {formatPeso(Number(row?.revenue ?? 0))}
                            </td>
                            <td className="py-1.5 text-right text-amber-700">
                              {formatPeso(Number(row?.points_paid ?? 0))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NetworkTreeTab;
