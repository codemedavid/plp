import React, { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const hashLooksLikeRecovery = () =>
  typeof window !== 'undefined' &&
  (window.location.hash.includes('type=recovery') ||
    new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'recovery');

const ResetPasswordModal: React.FC = () => {
  const { passwordRecovery, updatePassword, clearPasswordRecovery } = useAuth();
  const [hashRecovery, setHashRecovery] = useState<boolean>(hashLooksLikeRecovery);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (passwordRecovery) setHashRecovery(true);
  }, [passwordRecovery]);

  const open = passwordRecovery || hashRecovery;
  if (!open) return null;

  const close = () => {
    setPassword('');
    setConfirm('');
    setError(null);
    setInfo(null);
    setHashRecovery(false);
    clearPasswordRecovery();
    if (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery')) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    setInfo('Password updated. You are signed in.');
    setTimeout(close, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-title"
    >
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl">
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1 text-charcoal-400 hover:text-navy-900 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <div className="p-8">
          <h2 id="reset-password-title" className="font-heading text-xl tracking-[0.18em] text-navy-900 uppercase text-center">
            Set New Password
          </h2>
          <p className="text-xs text-charcoal-500 text-center mt-2 tracking-wider">
            Choose a new password for your account
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[11px] tracking-[0.18em] uppercase text-navy-900">New Password</span>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" strokeWidth={1.5} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-charcoal-200 rounded text-sm text-navy-900 focus:outline-none focus:border-gold-600"
                  placeholder="At least 6 characters"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[11px] tracking-[0.18em] uppercase text-navy-900">Confirm Password</span>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" strokeWidth={1.5} />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-charcoal-200 rounded text-sm text-navy-900 focus:outline-none focus:border-gold-600"
                  placeholder="Re-enter password"
                />
              </div>
            </label>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}
            {info && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-navy-900 text-white text-[11px] tracking-[0.22em] uppercase font-medium hover:bg-gold-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
