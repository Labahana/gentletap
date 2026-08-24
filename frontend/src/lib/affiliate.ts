import { api } from './api';

const REF_COOKIE = 'gt_affiliate_ref';
const REF_COOKIE_DAYS = 60;
export const AFFILIATE_TOKEN_KEY = 'gentletap_affiliate_token';
export const AFFILIATE_REFRESH_KEY = 'gentletap_affiliate_refresh_token';

/** Reads ?ref= from the current URL (lowercased). */
export function getAffiliateRefFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const ref = new URLSearchParams(window.location.search).get('ref');
  return ref?.trim().toLowerCase() || null;
}

export function setAffiliateRefCookie(refCode: string): void {
  const maxAge = REF_COOKIE_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(refCode.toLowerCase())}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function getAffiliateRefCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return null;
  }
}

export async function trackAffiliateClick(refCode: string): Promise<void> {
  await api
    .post('/affiliates/track-click', {
      ref_code: refCode,
      landing_path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
    })
    .catch(() => undefined);
}

export async function attributeAffiliateReferral(refCode: string): Promise<boolean> {
  try {
    const res = await api.post('/affiliates/attribute', { ref_code: refCode });
    return !!res.data?.attached;
  } catch {
    return false;
  }
}

/** After login/signup: attach the cookie'd referral to the org, then clear the cookie. */
export async function tryAttributeAfterAuth(): Promise<void> {
  const ref = getAffiliateRefCookie();
  if (!ref) return;
  const attached = await attributeAffiliateReferral(ref);
  if (attached) clearAffiliateRefCookie();
}

function clearAffiliateRefCookie(): void {
  document.cookie = `${REF_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
