import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import posthog from 'posthog-js';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// flush_at / flush_interval are not in PostHogConfig typings; a non-literal avoids the excess-property check.
const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  flush_at: 1,
  flush_interval: 0,
};
posthog.init(import.meta.env.VITE_POSTHOG_KEY, posthogOptions);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);
