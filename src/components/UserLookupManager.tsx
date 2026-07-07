import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, ChevronRight, Mail, Phone, MapPin, Wallet, ShoppingBag, Users as UsersIcon, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfileRow {
  id: string;
  referral_code: string;
  referred_by: string | null;
  full_name: string | null;
  nickname: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  email: string | null;
  facebook: string | null;
  frozen: boolean;
  role: 'user' | 'admin' | string;
  created_at: string;
}

interface BalanceRow {
  user_id: string;
  balance: number;
}

interface OrderRow {
  id: string;
  user_id: string | null;
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  total_price: number;
  subtotal: number | null;
  shipping_fee: number | null;
  discount_applied: number | null;
  points_redeemed: number | null;
  order_status: string | null;
  payment_status: string | null;
  created_at: string;
}

interface LedgerRow {
  id: string;
  delta: number;
  reason: string;
  source_order_id: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

interface UserOverview {
  profile: ProfileRow;
  email: string | null;
  balance: number;
  orderCount: number;
  totalSpent: number;
  referralCount: number;
  orders: OrderRow[];
  referredBy: ProfileRow | null;
  referrals: ProfileRow[];
}

interface UserLookupManagerProps {
  onBack: () => void;
}

export default function UserLookupManager({ onBack }: UserLookupManagerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profilesRes, balancesRes, ordersRes] = await Promise.all([
          supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('user_point_balance').select('user_id, balance'),
          supabase
            .from('orders')
            .select('id,user_id,order_number,customer_name,customer_email,customer_phone,shipping_address,shipping_city,total_price,subtotal,shipping_fee,discount_applied,points_redeemed,order_status,payment_status,created_at')
            .order('created_at', { ascending: false }),
        ]);
        if (profilesRes.error) throw profilesRes.error;
        if (balancesRes.error) throw balancesRes.error;
        if (ordersRes.error) throw ordersRes.error;
        setProfiles((profilesRes.data as ProfileRow[]) ?? []);
        setBalances((balancesRes.data as BalanceRow[]) ?? []);
        setOrders((ordersRes.data as OrderRow[]) ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const overviews = useMemo<UserOverview[]>(() => {
    const balanceByUser = new Map(balances.map(b => [b.user_id, b.balance]));
    const ordersByUser = new Map<string, OrderRow[]>();
    const emailByUser = new Map<string, string>();
    for (const o of orders) {
      if (!o.user_id) continue;
      if (!ordersByUser.has(o.user_id)) ordersByUser.set(o.user_id, []);
      ordersByUser.get(o.user_id)!.push(o);
      if (o.customer_email && !emailByUser.has(o.user_id)) {
        emailByUser.set(o.user_id, o.customer_email);
      }
    }
    const referralsByInviter = new Map<string, ProfileRow[]>();
    for (const p of profiles) {
      if (p.referred_by) {
        if (!referralsByInviter.has(p.referred_by)) referralsByInviter.set(p.referred_by, []);
        referralsByInviter.get(p.referred_by)!.push(p);
      }
    }
    const profileById = new Map(profiles.map(p => [p.id, p]));
    return profiles.map(p => {
      const userOrders = ordersByUser.get(p.id) ?? [];
      const totalSpent = userOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
      const refs = referralsByInviter.get(p.id) ?? [];
      return {
        profile: p,
        email: p.email ?? emailByUser.get(p.id) ?? null,
        balance: balanceByUser.get(p.id) ?? 0,
        orderCount: userOrders.length,
        totalSpent,
        referralCount: refs.length,
        orders: userOrders,
        referredBy: p.referred_by ? profileById.get(p.referred_by) ?? null : null,
        referrals: refs,
      };
    });
  }, [profiles, balances, orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return overviews;
    return overviews.filter(o => {
      const hay = [
        o.profile.full_name,
        o.profile.nickname,
        o.profile.phone,
        o.profile.referral_code,
        o.profile.facebook,
        o.email,
        o.profile.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [overviews, query]);

  const selected = useMemo(
    () => overviews.find(o => o.profile.id === selectedId) ?? null,
    [overviews, selectedId]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">User Lookup</h1>
            <p className="text-xs text-gray-500">Signed-up users, orders, referrals & points</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name, email, code, phone…"
              className="bg-transparent outline-none text-sm flex-1"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">{error}</div>
        )}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading users…</div>
        ) : (
          <>
            <div className="mb-3 text-sm text-gray-600">
              {filtered.length} of {overviews.length} users
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-3">User</th>
                      <th className="text-left px-4 py-3">Email</th>
                      <th className="text-left px-4 py-3">Code</th>
                      <th className="text-right px-4 py-3">Orders</th>
                      <th className="text-right px-4 py-3">Spent</th>
                      <th className="text-right px-4 py-3">Points</th>
                      <th className="text-right px-4 py-3">Referrals</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => (
                      <tr
                        key={o.profile.id}
                        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedId(o.profile.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-amber-100 overflow-hidden flex items-center justify-center text-sm font-semibold text-amber-700 flex-shrink-0">
                              {o.profile.avatar_url ? (
                                <img src={o.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                ((o.profile.nickname || o.profile.full_name || o.email || '?').charAt(0).toUpperCase())
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-gray-900 font-medium truncate">
                                {o.profile.nickname || o.profile.full_name || '—'}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{o.profile.phone || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <span className="truncate block max-w-[220px]" title={o.email || ''}>
                            {o.email || <span className="text-gray-400">unknown</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700">{o.profile.referral_code}</td>
                        <td className="px-4 py-3 text-right">{o.orderCount}</td>
                        <td className="px-4 py-3 text-right">₱{o.totalSpent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{o.balance.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{o.referralCount}</td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                          No matching users
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {selected && (
        <UserDetailDrawer
          overview={selected}
          allProfiles={profiles}
          onClose={() => setSelectedId(null)}
          onRoleChanged={(id, role) =>
            setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)))
          }
          onReferralChanged={(id, patch) =>
            setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
          }
        />
      )}
    </div>
  );
}

function UserDetailDrawer({
  overview,
  allProfiles,
  onClose,
  onRoleChanged,
  onReferralChanged,
}: {
  overview: UserOverview;
  allProfiles: ProfileRow[];
  onClose: () => void;
  onRoleChanged: (id: string, role: 'user' | 'admin') => void;
  onReferralChanged: (id: string, patch: Partial<ProfileRow>) => void;
}) {
  const { profile, email, balance, orderCount, totalSpent, referralCount, orders, referredBy, referrals } = overview;
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [historyView, setHistoryView] = useState<'orders' | 'points' | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Fast-approve pending referral points. Pass a ledgerId to approve one entry,
  // or omit it to approve every pending entry for this user.
  const approvePending = async (ledgerId?: string) => {
    setApproving(ledgerId ?? 'all');
    setApproveError(null);
    const args = ledgerId
      ? { p_user_id: profile.id, p_ledger_id: ledgerId }
      : { p_user_id: profile.id };
    const { error } = await supabase.rpc('admin_approve_pending_points', args);
    setApproving(null);
    if (error) {
      setApproveError(error.message);
      return;
    }
    setLedger(prev =>
      prev
        ? prev.map(r =>
            (!ledgerId || r.id === ledgerId) && r.status === 'pending'
              ? { ...r, status: 'available' }
              : r
          )
        : prev
    );
  };

  const openPointsHistory = async () => {
    setHistoryView('points');
    if (ledger !== null) return;
    setLedgerLoading(true);
    setLedgerError(null);
    const { data, error } = await supabase
      .from('points_ledger')
      .select('id, delta, reason, source_order_id, status, notes, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(200);
    setLedgerLoading(false);
    if (error) {
      setLedgerError(error.message);
      return;
    }
    setLedger((data as LedgerRow[]) ?? []);
  };

  // ── Referral editing ──────────────────────────────────────
  const [editingReferral, setEditingReferral] = useState(false);
  const [refCodeInput, setRefCodeInput] = useState(profile.referral_code || '');
  const [inviterCodeInput, setInviterCodeInput] = useState(referredBy?.referral_code || '');
  const [refSaving, setRefSaving] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [refSuccess, setRefSuccess] = useState<string | null>(null);

  useEffect(() => {
    setRefCodeInput(profile.referral_code || '');
    setInviterCodeInput(referredBy?.referral_code || '');
    setRefError(null);
    setRefSuccess(null);
    setEditingReferral(false);
  }, [profile.id, profile.referral_code, referredBy?.referral_code]);

  const saveReferralChanges = async () => {
    setRefError(null);
    setRefSuccess(null);
    const newCode = refCodeInput.trim().toUpperCase();
    const newInviterCode = inviterCodeInput.trim().toUpperCase();

    if (!newCode) {
      setRefError('Referral code cannot be empty.');
      return;
    }

    let inviterId: string | null = null;
    if (newInviterCode) {
      if (newInviterCode === newCode) {
        setRefError("A user can't be their own inviter.");
        return;
      }
      const inviter = allProfiles.find(p => (p.referral_code || '').toUpperCase() === newInviterCode);
      if (!inviter) {
        setRefError(`No user found with referral code "${newInviterCode}".`);
        return;
      }
      if (inviter.id === profile.id) {
        setRefError("A user can't be their own inviter.");
        return;
      }
      inviterId = inviter.id;
    }

    if (newCode !== (profile.referral_code || '').toUpperCase()) {
      const clash = allProfiles.find(
        p => p.id !== profile.id && (p.referral_code || '').toUpperCase() === newCode
      );
      if (clash) {
        setRefError(`Referral code "${newCode}" is already used by another user.`);
        return;
      }
    }

    setRefSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ referral_code: newCode, referred_by: inviterId })
      .eq('id', profile.id);
    setRefSaving(false);

    if (error) {
      setRefError(error.message);
      return;
    }
    onReferralChanged(profile.id, { referral_code: newCode, referred_by: inviterId });
    setRefSuccess('Referral details updated.');
    setEditingReferral(false);
  };

  const toggleRole = async () => {
    setRoleSaving(true);
    setRoleError(null);
    const nextRole: 'user' | 'admin' = profile.role === 'admin' ? 'user' : 'admin';
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: nextRole })
      .eq('id', profile.id);
    setRoleSaving(false);
    if (error) {
      setRoleError(error.message);
      return;
    }
    onRoleChanged(profile.id, nextRole);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-900">User details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 overflow-hidden flex items-center justify-center text-2xl font-semibold text-amber-700">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                ((profile.nickname || profile.full_name || email || '?').charAt(0).toUpperCase())
              )}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-gray-900 truncate">
                {profile.nickname || profile.full_name || 'Unnamed user'}
              </div>
              <div className="text-xs text-gray-500 font-mono">{profile.id}</div>
              {profile.frozen && (
                <span className="inline-block mt-1 text-[10px] uppercase tracking-wider bg-red-50 text-red-700 px-2 py-0.5 rounded">
                  Frozen
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              icon={<ShoppingBag className="w-4 h-4" />}
              label="Orders"
              value={String(orderCount)}
              onClick={() => setHistoryView('orders')}
            />
            <Stat
              icon={<Wallet className="w-4 h-4" />}
              label="Spent"
              value={`₱${totalSpent.toLocaleString()}`}
              onClick={() => setHistoryView('orders')}
            />
            <Stat
              icon={<Wallet className="w-4 h-4" />}
              label="Points"
              value={balance.toLocaleString()}
              onClick={openPointsHistory}
            />
            <Stat icon={<UsersIcon className="w-4 h-4" />} label="Referrals" value={String(referralCount)} />
          </div>

          <Section title="Role & Access">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                  profile.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {profile.role || 'user'}
              </span>
              <button
                onClick={toggleRole}
                disabled={roleSaving}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                  profile.role === 'admin'
                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                    : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                } disabled:opacity-50`}
              >
                {roleSaving ? 'Saving…' : profile.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
              </button>
            </div>
            {roleError && <p className="text-xs text-red-600 mt-2">{roleError}</p>}
            <p className="text-[11px] text-gray-500 mt-2">
              Only admins can change roles. The database enforces this with RLS.
            </p>
          </Section>

          <Section title="Contact">
            <Field icon={<Mail className="w-3.5 h-3.5" />} label="Email">{email || '—'}</Field>
            <Field icon={<Phone className="w-3.5 h-3.5" />} label="Phone">{profile.phone || '—'}</Field>
            <Field icon={<MapPin className="w-3.5 h-3.5" />} label="Address">{profile.address || '—'}</Field>
            <Field label="Full name">{profile.full_name || '—'}</Field>
            <Field label="Nickname">{profile.nickname || '—'}</Field>
            <Field label="Facebook">
              {profile.facebook ? (
                /^https?:\/\//i.test(profile.facebook) ? (
                  <a href={profile.facebook} target="_blank" rel="noreferrer" className="text-indigo-600 underline break-all">
                    {profile.facebook}
                  </a>
                ) : (
                  profile.facebook
                )
              ) : (
                '—'
              )}
            </Field>
            <Field label="Referral code"><span className="font-mono">{profile.referral_code}</span></Field>
            <Field label="Joined">{new Date(profile.created_at).toLocaleString()}</Field>
          </Section>

          <Section title={`Orders (${orders.length})`}>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {orders.map(o => (
                  <div key={o.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="font-medium text-gray-900">{o.order_number || o.id.slice(0, 8)}</div>
                      <div className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString()}</div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Total: <strong>₱{Number(o.total_price).toLocaleString()}</strong></span>
                      {o.points_redeemed ? <span>Points used: {o.points_redeemed}</span> : null}
                      {o.discount_applied ? <span>Discount: ₱{Number(o.discount_applied).toLocaleString()}</span> : null}
                      <span>Order: <StatusBadge value={o.order_status} /></span>
                      <span>Payment: <StatusBadge value={o.payment_status} /></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Referrals">
            <div className="flex items-center justify-between -mt-1 mb-1">
              <span className="text-[11px] text-gray-500">Code &amp; inviter</span>
              {!editingReferral ? (
                <button
                  onClick={() => {
                    setRefError(null);
                    setRefSuccess(null);
                    setRefCodeInput(profile.referral_code || '');
                    setInviterCodeInput(referredBy?.referral_code || '');
                    setEditingReferral(true);
                  }}
                  className="text-xs px-2.5 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingReferral(false);
                      setRefCodeInput(profile.referral_code || '');
                      setInviterCodeInput(referredBy?.referral_code || '');
                      setRefError(null);
                    }}
                    disabled={refSaving}
                    className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveReferralChanges}
                    disabled={refSaving}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {refSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {!editingReferral ? (
              <>
                <Field label="Referral code">
                  <span className="font-mono">{profile.referral_code}</span>
                </Field>
                <Field label="Referred by">
                  {referredBy ? (
                    <span>
                      {referredBy.nickname || referredBy.full_name || '—'}{' '}
                      <span className="text-gray-400 font-mono">({referredBy.referral_code})</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </Field>
              </>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500">
                    Referral code (this user&rsquo;s own)
                  </label>
                  <input
                    value={refCodeInput}
                    onChange={(e) => setRefCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. JANE7K3"
                    className="mt-1 w-full font-mono text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="text-sm">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500">
                    Inviter&rsquo;s referral code (set this user as their invitee)
                  </label>
                  <input
                    value={inviterCodeInput}
                    onChange={(e) => setInviterCodeInput(e.target.value.toUpperCase())}
                    placeholder="Leave blank to clear inviter"
                    className="mt-1 w-full font-mono text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-400"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Enter the referral code of the user who invited them. Leave empty to remove the link.
                  </p>
                </div>
              </div>
            )}

            {refError && <p className="text-xs text-red-600">{refError}</p>}
            {refSuccess && <p className="text-xs text-emerald-600">{refSuccess}</p>}

            <Field label={`Invited (${referrals.length})`}>
              {referrals.length === 0 ? (
                '—'
              ) : (
                <ul className="space-y-1 mt-1">
                  {referrals.map(r => (
                    <li key={r.id} className="text-sm">
                      {r.nickname || r.full_name || '—'}{' '}
                      <span className="text-gray-400 font-mono text-xs">({r.referral_code})</span>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          </Section>

          <Section title="Earnings">
            <Field label="Current balance">{balance.toLocaleString()} pts (≈ ₱{balance.toLocaleString()})</Field>
            <p className="text-xs text-gray-500">
              Click the <strong>Points</strong> stat above to view this user&rsquo;s full points history.
              Manage withdrawals in the Referrals section.
            </p>
          </Section>
        </div>

        {historyView === 'orders' && (
          <OrdersHistoryModal orders={orders} onClose={() => setHistoryView(null)} />
        )}
        {historyView === 'points' && (
          <PointsHistoryModal
            balance={balance}
            ledger={ledger}
            loading={ledgerLoading}
            error={ledgerError}
            orders={orders}
            approving={approving}
            approveError={approveError}
            onApproveOne={approvePending}
            onApproveAll={() => approvePending()}
            onClose={() => setHistoryView(null)}
          />
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const baseCls = 'border border-gray-200 rounded-lg p-3 text-left w-full';
  const interactiveCls = onClick
    ? 'hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer'
    : '';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`${baseCls} ${interactiveCls}`.trim()}
    >
      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className="text-lg font-bold text-gray-900 mt-1">{value}</div>
    </Tag>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-sm">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="text-gray-900 break-words">{children}</div>
    </div>
  );
}

function OrdersHistoryModal({
  orders,
  onClose,
}: {
  orders: OrderRow[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-gray-900">Order history ({orders.length})</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3 flex-1">
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders yet.</p>
          ) : (
            orders.map((o) => {
              const subtotal =
                Number(o.total_price) +
                Number(o.discount_applied || 0) +
                Number(o.points_redeemed || 0) -
                Number(o.shipping_fee || 0);
              return (
                <div key={o.id} className="border border-gray-200 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-semibold text-gray-900">
                      {o.order_number || o.id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span>Order: <StatusBadge value={o.order_status} /></span>
                    <span>Payment: <StatusBadge value={o.payment_status} /></span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 space-y-1 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {o.discount_applied && Number(o.discount_applied) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount</span>
                        <span>-₱{Number(o.discount_applied).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {o.points_redeemed && Number(o.points_redeemed) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Points used</span>
                        <span>
                          -₱{Number(o.points_redeemed).toLocaleString('en-PH', { minimumFractionDigits: 2 })} ({Number(o.points_redeemed).toLocaleString('en-PH')} pts)
                        </span>
                      </div>
                    )}
                    {o.shipping_fee && Number(o.shipping_fee) > 0 && (
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>₱{Number(o.shipping_fee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1">
                      <span>Total</span>
                      <span>₱{Number(o.total_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const POINTS_REASON_LABEL: Record<string, string> = {
  referral_l1: 'Referral (Tier 1)',
  referral_l2: 'Referral (Tier 2)',
  referral_l3: 'Referral (Tier 3)',
  redemption: 'Used at checkout',
  withdrawal: 'Withdrawal',
  refund_reversal: 'Refund reversal',
  admin_adjust: 'Admin adjustment',
  admin_adjustment: 'Admin adjustment',
};

function PointsHistoryModal({
  balance,
  ledger,
  loading,
  error,
  orders,
  approving,
  approveError,
  onApproveOne,
  onApproveAll,
  onClose,
}: {
  balance: number;
  ledger: LedgerRow[] | null;
  loading: boolean;
  error: string | null;
  orders: OrderRow[];
  approving: string | null;
  approveError: string | null;
  onApproveOne: (ledgerId: string) => void;
  onApproveAll: () => void;
  onClose: () => void;
}) {
  const orderNumberById = new Map(orders.map((o) => [o.id, o.order_number || o.id.slice(0, 8)]));
  const pendingRows = (ledger ?? []).filter((r) => r.status === 'pending' && r.delta > 0);
  const pendingTotal = pendingRows.reduce((sum, r) => sum + r.delta, 0);
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-gray-900">Points history</h3>
            <p className="text-xs text-gray-500">Current balance: {balance.toLocaleString()} pts</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          {pendingRows.length > 0 && (
            <div className="mb-4 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm text-amber-800">
                {pendingRows.length} pending entr{pendingRows.length === 1 ? 'y' : 'ies'} · ₱{pendingTotal.toLocaleString()} awaiting approval
              </div>
              <button
                onClick={onApproveAll}
                disabled={approving !== null}
                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
              >
                {approving === 'all' ? 'Approving…' : 'Approve all pending'}
              </button>
            </div>
          )}
          {approveError && <p className="mb-3 text-sm text-red-600">{approveError}</p>}
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && ledger && ledger.length === 0 && (
            <p className="text-sm text-gray-500">No points activity yet.</p>
          )}
          {!loading && !error && ledger && ledger.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Points</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => {
                  const isCredit = row.delta > 0;
                  const orderRef = row.source_order_id
                    ? orderNumberById.get(row.source_order_id) || row.source_order_id.slice(0, 8)
                    : null;
                  return (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-3 text-xs text-gray-600 align-top whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-gray-900 align-top">
                        <div>{POINTS_REASON_LABEL[row.reason] || row.reason}</div>
                        {row.notes && <div className="text-[11px] text-gray-500">{row.notes}</div>}
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-700 align-top">
                        {orderRef || '—'}
                      </td>
                      <td className="py-2 pr-3 align-top">
                        {row.status ? <StatusBadge value={row.status} /> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className={`py-2 pr-3 text-right font-semibold align-top ${isCredit ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isCredit ? '+' : ''}{row.delta.toLocaleString()}
                      </td>
                      <td className="py-2 text-right align-top">
                        {row.status === 'pending' && row.delta > 0 ? (
                          <button
                            onClick={() => onApproveOne(row.id)}
                            disabled={approving !== null}
                            className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {approving === row.id ? '…' : 'Approve'}
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-400">—</span>;
  const cls =
    value.includes('paid') || value.includes('delivered') || value.includes('completed')
      ? 'bg-emerald-50 text-emerald-700'
      : value.includes('pending')
      ? 'bg-amber-50 text-amber-700'
      : value.includes('cancel') || value.includes('reject') || value.includes('failed')
      ? 'bg-red-50 text-red-700'
      : 'bg-blue-50 text-blue-700';
  return <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${cls}`}>{value}</span>;
}
