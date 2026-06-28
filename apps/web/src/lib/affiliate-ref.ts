const REF_COOKIE = "gt_affiliate_ref";
const REF_COOKIE_DAYS = 30;

export function getAffiliateRefFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const ref = new URLSearchParams(window.location.search).get("ref");
  return ref?.trim().toLowerCase() || null;
}

export function setAffiliateRefCookie(refCode: string): void {
  const maxAge = REF_COOKIE_DAYS * 24 * 60 * 60;
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(refCode.toLowerCase())}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getAffiliateRefCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return null;
  }
}

export function clearAffiliateRefCookie(): void {
  document.cookie = `${REF_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export async function trackAffiliateClick(refCode: string): Promise<void> {
  await fetch("/v1/affiliates/track-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ref_code: refCode,
      landing_path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
    }),
  }).catch(() => undefined);
}

export async function attributeAffiliateReferral(userToken: string, refCode: string): Promise<void> {
  await fetch("/v1/affiliates/attribute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ ref_code: refCode }),
  }).catch(() => undefined);
}

export async function tryAttributeFromCookie(userToken: string): Promise<void> {
  const ref = getAffiliateRefCookie();
  if (!ref) return;
  await attributeAffiliateReferral(userToken, ref);
}
