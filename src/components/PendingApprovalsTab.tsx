import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  groupPendingByUser,
  type PendingLedgerRow,
  type PendingProfile,
  type PendingUserGroup,
} from '../utils/pendingApprovals';

// Admin queue of every user holding pending referral points, with one-click
// approval per user. Approval flips their pending ledger rows to 'available'
// via the admin-gated admin_approve_pending_points RPC.
export default function PendingApprovalsTab() {
  const [groups, setGroups] = useState<PendingUserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ledgerRes, profilesRes] = await Promise.all([
        supabase
          .from('points_ledger')
          .select('id, user_id, delta, reason, period_month, notes, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('user_profiles')
          .select('id, full_name, nickname, referral_code, email, frozen'),
      ]);
      if (ledgerRes.error) throw ledgerRes.error;
      if (profilesRes.error) throw profilesRes.error;
      const rows = (ledgerRes.data as PendingLedgerRow[]) ?? [];
      const profiles = (profilesRes.data as PendingProfile[]) ?? [];
      setGroups(groupPendingByUser(rows, profiles));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load pending points');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approveUser = async (userId: string) => {
    setApproving(userId);
    setError(null);
    const { error: rpcError } = await supabase.rpc('admin_approve_pending_points', { p_user_id: userId });
    setApproving(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    // Optimistically drop the approved user from the queue.
    setGroups(prev => prev.filter(g => g.userId !== userId));
  };

  const totalPending = groups.reduce((sum, g) => sum + g.totalPending, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-bold text-gray-900">Pending Approvals</h2>
          <p className="text-xs text-gray-500">
            {groups.length} user{groups.length === 1 ? '' : 's'} · ₱{totalPending.toLocaleString()} awaiting approval
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500 text-sm">No pending points to approve.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Code</th>
                <th className="text-right p-3">Entries</th>
                <th className="text-right p-3">Pending</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.userId} className="border-t border-gray-100">
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{g.name}</div>
                    {g.email && <div className="text-xs text-gray-500">{g.email}</div>}
                    {g.frozen && (
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-wider bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                        Frozen
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-700">{g.referralCode || '—'}</td>
                  <td className="p-3 text-right">{g.entryCount}</td>
                  <td className="p-3 text-right font-semibold">₱{g.totalPending.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => approveUser(g.userId)}
                      disabled={approving === g.userId}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {approving === g.userId ? 'Approving…' : 'Approve'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
