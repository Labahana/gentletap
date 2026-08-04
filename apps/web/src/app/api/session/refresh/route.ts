import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applySessionCookies, clearSessionCookies, REFRESH_COOKIE } from "@/lib/session-cookies";
import { backendJson } from "@/lib/server-api";
import type { TokenResponse } from "@/lib/api";

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    // No session to refresh — nothing to clear. Sending Set-Cookie deletes here
    // can race a concurrent login/register and wipe the brand-new session.
    return NextResponse.json({ detail: "No session" }, { status: 401 });
  }

  let tokens;
  try {
    tokens = await backendJson<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    });
  } catch {
    // Backend unreachable — keep cookies so the client can retry later.
    return NextResponse.json({ detail: "Service temporarily unavailable" }, { status: 502 });
  }
  if (!tokens.ok) {
    const response = NextResponse.json({ detail: tokens.detail }, { status: tokens.status });
    // Only a definitive rejection invalidates the session; 5xx stays retryable.
    if (tokens.status === 401 || tokens.status === 403) {
      clearSessionCookies(response);
    }
    return response;
  }

  const response = NextResponse.json({ status: "refreshed" });
  applySessionCookies(response, tokens.data);
  return response;
}
