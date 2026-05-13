import React from 'react';
import { isSupabaseConfigured } from '../lib/supabase';

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('App error boundary caught:', error, info);
  }

  render() {
    if (!isSupabaseConfigured) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream-light px-4">
          <div className="max-w-md text-center">
            <h1 className="font-heading text-2xl text-navy-900 mb-3">Configuration error</h1>
            <p className="text-charcoal-500 text-sm leading-relaxed">
              The site is missing required configuration (Supabase URL / anon key).
              Please set <code className="bg-charcoal-100 px-1 rounded">VITE_SUPABASE_URL</code>{' '}
              and <code className="bg-charcoal-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>{' '}
              and reload.
            </p>
          </div>
        </div>
      );
    }
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream-light px-4">
          <div className="max-w-md text-center">
            <h1 className="font-heading text-2xl text-navy-900 mb-3">Something went wrong</h1>
            <p className="text-charcoal-500 text-sm leading-relaxed mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-navy-900 hover:bg-gold-600 text-white text-[11px] font-semibold tracking-[0.22em] uppercase transition-colors rounded"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
