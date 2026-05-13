import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App.tsx';
import './index.css';

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  flush_at: 1,
  flush_interval: 0,
  loaded: (ph) => {
    if (!localStorage.getItem('plp_welcomed')) {
      ph.capture('plp_welcome_user');
      localStorage.setItem('plp_welcomed', 'true');
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
