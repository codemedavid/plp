import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Share2, Wallet, Gift, TrendingUp, AlertCircle, Camera, Pencil, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useReferral, type WithdrawalRow, type UserProfile as UserProfileRow, type UpdateProfileInput } from '../hooks/useReferral';
import { supabase } from '../lib/supabase';

const REASON_LABEL: Record<string, string> = {
  referral_l1: 'Level 1 referral',
  referral_l2: 'Level 2 referral',
  referral_l3: 'Level 3 referral',
  redemption: 'Used at checkout',
  withdrawal: 'Withdrawal',
  refund_reversal: 'Order refund reversal',
  admin_adjust: 'Admin adjustment',
};

const STATUS_LABEL: Record<WithdrawalRow['status'], string> = {
  pending: 'Pending review',
  approved: 'Approved',
  paid: 'Paid',
  rejected: 'Rejected',
};

export default function UserProfile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, balance, ledger, withdrawals, hasOrderThisMonth, loading, error, requestWithdrawal, updateProfile } = useReferral();

  if (authLoading) {
    return <FullPage>Loading…</FullPage>;
  }
  if (!user) {
    return (
      <FullPage>
        <h2 className="font-heading text-3xl text-navy-900 mb-4">Sign in required</h2>
        <p className="text-charcoal-500 mb-6">You need to sign in to view your rewards profile.</p>
        <Link to="/" className="text-gold-600 underline">Back to home</Link>
      </FullPage>
    );
  }

  const shareUrl = profile ? `${window.location.origin}/?ref=${profile.referral_code}` : '';

  return (
    <div className="min-h-screen bg-cream-light">
      <header className="border-b border-gold-200">
        <div className="container mx-auto px-4 md:px-8 py-10 max-w-5xl">
          <Link to="/" className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-charcoal-500 hover:text-navy-900 transition-colors mb-8">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" strokeWidth={1.8} />
            Back to shop
          </Link>
          <div className="flex items-start sm:items-end justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
              <AvatarUploader
                userId={user.id}
                avatarUrl={profile?.avatar_url ?? null}
                fallback={(profile?.nickname || profile?.full_name || user.email || '?').charAt(0).toUpperCase()}
                onUploaded={url => updateProfile({ avatar_url: url })}
              />
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] uppercase tracking-[0.32em] text-gold-600 mb-2 sm:mb-3">My Account</span>
                <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl font-normal text-navy-900 tracking-tight break-words">
                  {profile?.nickname || profile?.full_name || user.email}
                </h1>
                <p className="text-xs sm:text-sm text-charcoal-500 mt-2 flex items-start gap-1.5 break-all">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span className="break-all">Signed up with {user.email}</span>
                </p>
              </div>
            </div>
            <button onClick={signOut} className="text-xs uppercase tracking-widest text-charcoal-500 hover:text-navy-900 flex-shrink-0">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-10 max-w-5xl space-y-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded text-sm flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Balance card */}
        <section className="grid md:grid-cols-3 gap-4">
          <Stat icon={<Wallet className="w-5 h-5" />} label="Available points" value={loading ? '—' : `${balance.toLocaleString()} pts`} sub={`≈ ₱${balance.toLocaleString()}`} />
          <Stat icon={<Gift className="w-5 h-5" />} label="Lifetime earned" value={loading ? '—' : `${lifetimeEarned(ledger).toLocaleString()} pts`} />
          <Stat icon={<TrendingUp className="w-5 h-5" />} label="This month order" value={hasOrderThisMonth ? 'Active' : 'None yet'} sub={hasOrderThisMonth ? 'Withdrawal eligible' : 'Place ≥1 order to withdraw'} />
        </section>

        {/* Profile details */}
        <ProfileDetails profile={profile} email={user.email ?? ''} onSave={updateProfile} />

        {/* Referral code + share */}
        <section className="bg-white border border-gold-200 rounded-sm p-6 md:p-8">
          <h2 className="font-heading text-2xl text-navy-900 mb-1">Your referral code</h2>
          <p className="text-sm text-charcoal-500 mb-5">Share this code with friends — earn points every time they order Tirzepatide or PLP-Slim.</p>
          {profile && (
            <ShareBlock code={profile.referral_code} url={shareUrl} />
          )}
          <div className="grid sm:grid-cols-3 gap-3 mt-6 text-center">
            <Tier level={1} pts={500} />
            <Tier level={2} pts={150} />
            <Tier level={3} pts={50} />
          </div>
        </section>

        {/* Withdrawal */}
        <WithdrawForm
          balance={balance}
          hasOrderThisMonth={hasOrderThisMonth}
          onSubmit={requestWithdrawal}
        />

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <section>
            <h2 className="font-heading text-2xl text-navy-900 mb-4">Withdrawals</h2>
            <div className="bg-white border border-gold-200 rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-cream-light text-charcoal-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Method</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id} className="border-t border-gold-100">
                      <td className="p-3">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="p-3 capitalize">{w.method.replace('_', ' ')}</td>
                      <td className="p-3 text-right">₱{w.amount.toLocaleString()}</td>
                      <td className="p-3"><StatusPill status={w.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Ledger */}
        <section>
          <h2 className="font-heading text-2xl text-navy-900 mb-4">Points history</h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-charcoal-500">No activity yet. Share your code to start earning.</p>
          ) : (
            <div className="bg-white border border-gold-200 rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-cream-light text-charcoal-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Reason</th>
                    <th className="text-right p-3">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map(e => (
                    <tr key={e.id} className="border-t border-gold-100">
                      <td className="p-3">{new Date(e.created_at).toLocaleDateString()}</td>
                      <td className="p-3">{REASON_LABEL[e.reason] ?? e.reason}{e.notes ? ` — ${e.notes}` : ''}</td>
                      <td className={`p-3 text-right font-medium ${e.delta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {e.delta >= 0 ? '+' : ''}{e.delta.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-light flex items-center justify-center px-4">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gold-200 rounded-sm p-5">
      <div className="flex items-center gap-2 text-charcoal-500 text-xs uppercase tracking-wider">{icon}{label}</div>
      <div className="font-heading text-3xl text-navy-900 mt-2">{value}</div>
      {sub && <div className="text-xs text-charcoal-500 mt-1">{sub}</div>}
    </div>
  );
}

function Tier({ level, pts }: { level: number; pts: number }) {
  return (
    <div className="border border-gold-100 rounded-sm p-3">
      <div className="text-xs uppercase tracking-wider text-charcoal-500">Level {level}</div>
      <div className="font-heading text-xl text-navy-900">{pts} pts</div>
      <div className="text-xs text-charcoal-500">per qualifying order</div>
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
  return <span className={`text-xs px-2 py-1 rounded ${cls}`}>{STATUS_LABEL[status]}</span>;
}

function ShareBlock({ code, url }: { code: string; url: string }) {
  const [copiedField, setCopiedField] = useState<'code' | 'url' | null>(null);
  const copy = async (text: string, field: 'code' | 'url') => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join PLP', text: `Use my code ${code} on PLP`, url });
      } catch { /* user dismissed */ }
    } else {
      copy(url, 'url');
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        <div className="flex-1 bg-cream-light border border-gold-200 px-4 py-3 font-mono text-xl tracking-widest text-navy-900">{code}</div>
        <button onClick={() => copy(code, 'code')} className="px-4 border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-cream-light text-xs uppercase tracking-wider flex items-center gap-1.5">
          {copiedField === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedField === 'code' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex items-stretch gap-2">
        <div className="flex-1 bg-cream-light border border-gold-200 px-4 py-3 text-xs text-charcoal-500 truncate">{url}</div>
        <button onClick={() => copy(url, 'url')} className="px-4 border border-gold-300 text-charcoal-700 hover:bg-gold-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
          {copiedField === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Link
        </button>
        <button onClick={share} className="px-4 bg-navy-900 text-cream-light text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>
    </div>
  );
}

function WithdrawForm({
  balance,
  hasOrderThisMonth,
  onSubmit,
}: {
  balance: number;
  hasOrderThisMonth: boolean;
  onSubmit: (req: { amount: number; method: 'gcash' | 'bank' | 'store_credit'; payout_details: Record<string, string> }) => Promise<{ error: string | null }>;
}) {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'gcash' | 'bank' | 'store_credit'>('gcash');
  const [gcashNumber, setGcashNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const eligible = hasOrderThisMonth && balance > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) return setFeedback({ kind: 'err', msg: 'Enter a valid amount' });
    if (amt > balance) return setFeedback({ kind: 'err', msg: 'Amount exceeds balance' });

    const details: Record<string, string> =
      method === 'gcash'
        ? { gcash_number: gcashNumber }
        : method === 'bank'
        ? { bank_name: bankName, account_name: bankAccountName, account_number: bankAccountNumber }
        : {};
    if (method === 'gcash' && !gcashNumber) return setFeedback({ kind: 'err', msg: 'Enter GCash number' });
    if (method === 'bank' && (!bankName || !bankAccountName || !bankAccountNumber)) {
      return setFeedback({ kind: 'err', msg: 'Fill in all bank fields' });
    }

    setSubmitting(true);
    const { error } = await onSubmit({ amount: amt, method, payout_details: details });
    setSubmitting(false);
    if (error) setFeedback({ kind: 'err', msg: error });
    else {
      setFeedback({ kind: 'ok', msg: 'Withdrawal request submitted. Admin will process shortly.' });
      setAmount('');
    }
  };

  return (
    <section className="bg-white border border-gold-200 rounded-sm p-6 md:p-8">
      <h2 className="font-heading text-2xl text-navy-900 mb-1">Withdraw or use points</h2>
      <p className="text-sm text-charcoal-500 mb-5">
        Withdraw to GCash, bank, or hold as store credit. You can also use points at checkout — 1 pt = ₱1.
      </p>
      {!hasOrderThisMonth && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-xs mb-4 flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Withdrawal locked: place at least one order this calendar month to unlock.
        </div>
      )}
      <form onSubmit={submit} className={`space-y-4 ${eligible ? '' : 'opacity-60 pointer-events-none'}`}>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-charcoal-500">Amount (max ₱{balance.toLocaleString()})</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={1} max={balance} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-charcoal-500">Method</span>
            <select value={method} onChange={e => setMethod(e.target.value as typeof method)} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light">
              <option value="gcash">GCash</option>
              <option value="bank">Bank transfer</option>
              <option value="store_credit">Store credit (keep on account)</option>
            </select>
          </label>
        </div>
        {method === 'gcash' && (
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-charcoal-500">GCash number</span>
            <input value={gcashNumber} onChange={e => setGcashNumber(e.target.value)} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light" />
          </label>
        )}
        {method === 'bank' && (
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-charcoal-500">Bank</span>
              <input value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-charcoal-500">Account name</span>
              <input value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-charcoal-500">Account number</span>
              <input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light" />
            </label>
          </div>
        )}
        <button type="submit" disabled={submitting || !eligible} className="bg-navy-900 text-cream-light px-6 py-3 text-xs uppercase tracking-widest disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Request withdrawal'}
        </button>
        {feedback && (
          <div className={`text-sm ${feedback.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{feedback.msg}</div>
        )}
      </form>
    </section>
  );
}

function lifetimeEarned(ledger: { delta: number }[]): number {
  return ledger.reduce((sum, e) => (e.delta > 0 ? sum + e.delta : sum), 0);
}

function AvatarUploader({
  userId,
  avatarUrl,
  fallback,
  onUploaded,
}: {
  userId: string;
  avatarUrl: string | null;
  fallback: string;
  onUploaded: (url: string) => Promise<{ error: string | null }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setErr(null);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: saveErr } = await onUploaded(data.publicUrl);
      if (saveErr) throw new Error(saveErr);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gold-100 border border-gold-200 overflow-hidden flex items-center justify-center text-2xl font-heading text-navy-900 group"
        title="Change avatar"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span>{fallback}</span>
        )}
        <span className="absolute inset-0 bg-navy-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-cream-light">
          <Camera className="w-5 h-5" />
        </span>
        {uploading && (
          <span className="absolute inset-0 bg-navy-900/60 flex items-center justify-center text-cream-light text-[10px] uppercase tracking-wider">
            Uploading…
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      {err && <div className="absolute top-full mt-1 text-xs text-red-600 whitespace-nowrap">{err}</div>}
    </div>
  );
}

function ProfileDetails({
  profile,
  email,
  onSave,
}: {
  profile: UserProfileRow | null;
  email: string;
  onSave: (updates: UpdateProfileInput) => Promise<{ error: string | null }>;
}) {
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const start = () => {
    setNickname(profile?.nickname ?? '');
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setAddress(profile?.address ?? '');
    setFeedback(null);
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const { error } = await onSave({
      nickname: nickname.trim() || null,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    });
    setSaving(false);
    if (error) setFeedback({ kind: 'err', msg: error });
    else {
      setFeedback({ kind: 'ok', msg: 'Profile updated.' });
      setEditing(false);
    }
  };

  return (
    <section className="bg-white border border-gold-200 rounded-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading text-2xl text-navy-900">My details</h2>
          <p className="text-sm text-charcoal-500">Update your nickname, contact, and shipping address.</p>
        </div>
        {!editing && (
          <button onClick={start} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-navy-900 border border-navy-900 px-3 py-2 hover:bg-navy-900 hover:text-cream-light">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      {!editing ? (
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <DetailRow label="Email (signed up)" value={email} />
          <DetailRow label="Nickname" value={profile?.nickname || '—'} />
          <DetailRow label="Full name" value={profile?.full_name || '—'} />
          <DetailRow label="Phone" value={profile?.phone || '—'} />
          <div className="sm:col-span-2">
            <DetailRow label="Address" value={profile?.address || '—'} />
          </div>
        </dl>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-charcoal-500">Email (signed up)</span>
              <input value={email} disabled className="mt-1 w-full border border-gold-200 px-3 py-2 bg-gold-50 text-charcoal-500" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-charcoal-500">Nickname</span>
              <input value={nickname} onChange={e => setNickname(e.target.value)} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-charcoal-500">Full name</span>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-charcoal-500">Phone</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-charcoal-500">Address</span>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} className="mt-1 w-full border border-gold-200 px-3 py-2 bg-cream-light" />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="bg-navy-900 text-cream-light px-6 py-3 text-xs uppercase tracking-widest disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs uppercase tracking-widest text-charcoal-500 hover:text-navy-900">
              Cancel
            </button>
          </div>
          {feedback && (
            <div className={`text-sm ${feedback.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{feedback.msg}</div>
          )}
        </form>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-charcoal-500">{label}</dt>
      <dd className="text-navy-900 mt-1 break-words whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

