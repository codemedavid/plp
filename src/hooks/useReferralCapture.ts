import { useEffect } from 'react';

const STORAGE_KEY = 'plp_pending_referral_code';
const EXPIRY_KEY = 'plp_pending_referral_expires';
const EXPIRY_DAYS = 30;

// Read ?ref=CODE from the URL on first load and stash it until signup consumes it.
export function useReferralCapture(): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    if (!code) return;

    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(normalized)) return;

    const expiry = Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, normalized);
    localStorage.setItem(EXPIRY_KEY, String(expiry));
  }, []);
}

export function getPendingReferralCode(): string | null {
  const code = localStorage.getItem(STORAGE_KEY);
  const expiryStr = localStorage.getItem(EXPIRY_KEY);
  if (!code || !expiryStr) return null;
  if (Date.now() > Number(expiryStr)) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  }
  return code;
}

export function consumePendingReferralCode(): string | null {
  const code = getPendingReferralCode();
  if (code) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }
  return code;
}

export function setPendingReferralCode(code: string): void {
  const normalized = code.trim().toUpperCase();
  const expiry = Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(STORAGE_KEY, normalized);
  localStorage.setItem(EXPIRY_KEY, String(expiry));
}
