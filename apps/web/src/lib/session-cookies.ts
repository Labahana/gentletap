/** HttpOnly session cookies — tokens never exposed to client JavaScript. */

export const ACCESS_COOKIE = "gt_access";
export const REFRESH_COOKIE = "gt_refresh";

/** Access token lifetime (seconds) — keep in sync with API ACCESS_TOKEN_EXPIRE_MINUTES. */
export const ACCESS_MAX_AGE = 60 * 60;
/** Refresh token lifetime (seconds) — keep in sync with API refresh_token_expire_days. */
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function sessionCookieBase() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
  };
}

export function accessCookieOptions() {
  return { ...sessionCookieBase(), maxAge: ACCESS_MAX_AGE };
}

export function refreshCookieOptions() {
  return { ...sessionCookieBase(), maxAge: REFRESH_MAX_AGE };
}

/** Apply session cookies to a NextResponse (route handlers / middleware). */
export function applySessionCookies(
  response: { cookies: { set: (name: string, value: string, options: object) => void } },
  tokens: SessionTokens,
) {
  if (tokens.access_token) {
    response.cookies.set(ACCESS_COOKIE, tokens.access_token, accessCookieOptions());
  }
  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, refreshCookieOptions());
  }
}

export function clearSessionCookies(
  response: { cookies: { set: (name: string, value: string, options: object) => void } },
) {
  const base = sessionCookieBase();
  response.cookies.set(ACCESS_COOKIE, "", { ...base, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...base, maxAge: 0 });
}
