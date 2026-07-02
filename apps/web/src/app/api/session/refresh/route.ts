import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applySessionCookies, clearSessionCookies, REFRESH_COOKIE } from "@/lib/session-cookies";
import { backendJson } from "@/lib/server-api";
import type { TokenResponse } from "@/lib/api";

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    const response = NextResponse.json({ detail: "No session" }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const tokens = await backendJson<TokenResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!tokens.ok) {
    const response = NextResponse.json({ detail: tokens.detail }, { status: tokens.status });
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ status: "refreshed" });
  applySessionCookies(response, tokens.data);
  return response;
}
