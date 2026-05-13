import React, { useState } from 'react';
import { X, Mail, Lock } from 'lucide-react';
import posthog from 'posthog-js';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'signin' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setError(null);
    setInfo(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'signup') {
      const trimmedEmail = email.trim().toLowerCase();
      posthog.capture(
        'vrjonina_user_signed_up',
        {
          email: trimmedEmail,
          name: trimmedEmail.split('@')[0],
          signup_date: new Date().toISOString(),
          $set: { email: trimmedEmail },
        },
        { send_instantly: true }
      );
      setInfo('Account created. Check your email to confirm your address.');
    } else {
      onClose();
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-charcoal-400 hover:text-navy-900 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <div className="p-8">
          <h2 className="font-heading text-xl tracking-[0.18em] text-navy-900 uppercase text-center">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-xs text-charcoal-500 text-center mt-2 tracking-wider">
            {mode === 'signin' ? 'Welcome back' : 'Join the Peptide Lifestyle Program'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[11px] tracking-[0.18em] uppercase text-navy-900">Email</span>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" strokeWidth={1.5} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-charcoal-200 rounded text-sm text-navy-900 focus:outline-none focus:border-gold-600"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[11px] tracking-[0.18em] uppercase text-navy-900">Password</span>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" strokeWidth={1.5} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-charcoal-200 rounded text-sm text-navy-900 focus:outline-none focus:border-gold-600"
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
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
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-charcoal-500">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-gold-600 hover:underline font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-gold-600 hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
