import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, X, Save, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PendingApprovalsTab from './PendingApprovalsTab';

interface ReferralConfig {
  id: number;
  l1_points: number;
  l2_points: number;
  l3_points: number;
  enabled: boolean;
}

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  payout_details: Record<string, string>;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  admin_note: string | null;
  payout_reference: string | null;
  created_at: string;
  user_email?: string;
}

interface Props {
  onBack: () => void;
}

type Tab = 'withdrawals' | 'pending' | 'config' | 'products' | 'lookup';

export default function ReferralManager({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('withdrawals');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Referral Program</h1>
        </div>
        <div className="container mx-auto px-4 flex gap-1 text-sm">
          {(['withdrawals', 'pending', 'config', 'products', 'lookup'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 capitalize border-b-2 ${tab === t ? 'border-brand-600 text-brand-700 font-semibold' : 'border-transparent text-gray-600'}`}
            >
              {t === 'lookup' ? 'User Lookup' : t === 'pending' ? 'Pending Approvals' : t}
            </button>
          ))}
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {tab === 'config' && <ConfigTab />}
        {tab === 'withdrawals' && <WithdrawalsTab />}
        {tab === 'pending' && <PendingApprovalsTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'lookup' && <LookupTab />}
      </main>
    </div>
  );
}

function ConfigTab() {
  const [cfg, setCfg] = useState<ReferralConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('referral_config').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setCfg(data as ReferralConfig);
    });
  }, []);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('referral_config')
      .update({
        l1_points: cfg.l1_points,
        l2_points: cfg.l2_points,
        l3_points: cfg.l3_points,
        enabled: cfg.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : 'Saved');
    setTimeout(() => setMsg(null), 2500);
  };

  if (!cfg) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 max-w-xl">
      <h2 className="font-bold text-gray-900 mb-1">Payout Tiers</h2>
      <p className="text-xs text-gray-500 mb-4">Points awarded per qualifying order (1 pt = ₱1).</p>
      <div className="space-y-3">
        {([['l1_points', 'Level 1 (direct)'], ['l2_points', 'Level 2'], ['l3_points', 'Level 3']] as const).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700">{label}</span>
            <input
              type="number"
              min={0}
              value={cfg[key]}
              onChange={e => setCfg({ ...cfg, [key]: Number(e.target.value) })}
              className="w-32 border border-gray-300 rounded px-3 py-2 text-right"
            />
          </label>
        ))}
        <label className="flex items-center gap-2 pt-2">
          <input type="checkbox" checked={cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} />
          <span className="text-sm text-gray-700">Program enabled</span>
        </label>
      </div>
      <button onClick={save} disabled={saving} className="mt-5 bg-brand-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
        <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
      </button>
      {msg && <p className="text-xs text-gray-600 mt-2">{msg}</p>}
    </div>
  );
}

function WithdrawalsTab() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('withdrawals').select('*').order('created_at', { ascending: false }).limit(100);
    if (filter === 'pending') q = q.in('status', ['pending', 'approved']);
    const { data } = await q;
    setRows((data as WithdrawalRow[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (row: WithdrawalRow, status: WithdrawalRow['status'], opts?: { ref?: string; note?: string }) => {
    const updates: Record<string, unknown> = {
      status,
      processed_at: new Date().toISOString(),
      admin_note: opts?.note ?? row.admin_note,
      payout_reference: opts?.ref ?? row.payout_reference,
    };
    const { error: uErr } = await supabase.from('withdrawals').update(updates).eq('id', row.id);
    if (uErr) { alert(uErr.message); return; }

    // If marking paid (for gcash/bank), debit the user's points
    if (status === 'paid' && row.status !== 'paid') {
      const { error: lErr } = await supabase.from('points_ledger').insert({
        user_id: row.user_id,
        delta: -row.amount,
        reason: 'withdrawal',
        source_withdrawal_id: row.id,
        notes: `Paid via ${row.method}`,
      });
      if (lErr) alert(`Withdrawal marked paid, but ledger debit failed: ${lErr.message}`);
    }
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-gray-900">Withdrawal Requests</h2>
        <select value={filter} onChange={e => setFilter(e.target.value as 'pending' | 'all')} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="pending">Open</option>
          <option value="all">All</option>
        </select>
      </div>
      {loading ? <p className="text-gray-500">Loading…</p> : rows.length === 0 ? (
        <p className="text-gray-500 text-sm">No requests.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Method / Details</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                  <td className="p-3 text-xs">
                    <div className="font-semibold capitalize">{r.method.replace('_', ' ')}</div>
                    <div className="text-gray-600">{Object.entries(r.payout_details).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
                  </td>
                  <td className="p-3 text-right font-semibold">₱{r.amount.toLocaleString()}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                  <td className="p-3">
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <button title="Approve" onClick={() => updateStatus(r, 'approved')} className="p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"><Check className="w-3.5 h-3.5" /></button>
                        <button title="Reject" onClick={() => { const note = prompt('Reason?') || undefined; updateStatus(r, 'rejected', { note }); }} className="p-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    {(r.status === 'approved' || (r.status === 'pending' && r.method === 'store_credit')) && (
                      <button onClick={() => { const ref = prompt('Payout reference (txn ID)?') || ''; updateStatus(r, 'paid', { ref }); }} className="text-xs px-2 py-1 bg-emerald-600 text-white rounded">Mark paid</button>
                    )}
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

function ProductsTab() {
  const [products, setProducts] = useState<{ id: string; name: string; referral_eligible: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('id, name, referral_eligible').order('name');
    setProducts((data as { id: string; name: string; referral_eligible: boolean }[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, value: boolean) => {
    setProducts(p => p.map(x => x.id === id ? { ...x, referral_eligible: value } : x));
    const { error } = await supabase.from('products').update({ referral_eligible: value }).eq('id', id);
    if (error) { alert(error.message); load(); }
  };

  return (
    <div>
      <h2 className="font-bold text-gray-900 mb-1">Eligible Products</h2>
      <p className="text-xs text-gray-500 mb-4">Orders containing any of these products will trigger referral payouts.</p>
      {loading ? <p className="text-gray-500">Loading…</p> : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {products.map(p => (
            <label key={p.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
              <span className="text-sm text-gray-900">{p.name}</span>
              <input type="checkbox" checked={p.referral_eligible} onChange={e => toggle(p.id, e.target.checked)} />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function LookupTab() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ profile: Record<string, unknown>; balance: number; ledger: Record<string, unknown>[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setError(null);
    setResult(null);
    const q = query.trim();
    if (!q) return;
    let profileQ = supabase.from('user_profiles').select('*').limit(1);
    if (q.includes('@')) {
      // search by email via auth.users isn't accessible via RLS — search by code or id
      setError('Search by email not supported here. Use referral code or user id.');
      return;
    } else if (/^[A-Z0-9]{4,16}$/i.test(q)) {
      profileQ = profileQ.eq('referral_code', q.toUpperCase());
    } else {
      profileQ = profileQ.eq('id', q);
    }
    const { data: profile, error: pErr } = await profileQ.maybeSingle();
    if (pErr || !profile) { setError(pErr?.message || 'Not found'); return; }
    const [balRes, ledRes] = await Promise.all([
      supabase.from('user_point_balance').select('balance').eq('user_id', (profile as { id: string }).id).maybeSingle(),
      supabase.from('points_ledger').select('*').eq('user_id', (profile as { id: string }).id).order('created_at', { ascending: false }).limit(50),
    ]);
    setResult({
      profile: profile as Record<string, unknown>,
      balance: ((balRes.data as { balance: number } | null)?.balance) ?? 0,
      ledger: (ledRes.data as Record<string, unknown>[]) ?? [],
    });
  };

  return (
    <div>
      <h2 className="font-bold text-gray-900 mb-4">User Lookup</h2>
      <div className="flex gap-2 mb-4 max-w-md">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Referral code or user UUID" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
        <button onClick={search} className="bg-brand-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><Search className="w-4 h-4" /></button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="text-sm"><span className="text-gray-500">Code:</span> <span className="font-mono">{String(result.profile.referral_code)}</span></div>
          <div className="text-sm"><span className="text-gray-500">Balance:</span> <span className="font-semibold">₱{result.balance.toLocaleString()}</span></div>
          <div className="text-sm"><span className="text-gray-500">Frozen:</span> {result.profile.frozen ? 'Yes' : 'No'}</div>
          <details><summary className="cursor-pointer text-sm text-brand-700">Recent ledger</summary>
            <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto">{JSON.stringify(result.ledger, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: WithdrawalRow['status'] }) {
  const cls = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-blue-50 text-blue-700',
    paid: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
  }[status];
  return <span className={`text-xs px-2 py-0.5 rounded ${cls} capitalize`}>{status}</span>;
}
