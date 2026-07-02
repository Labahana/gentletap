import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applySessionCookies, clearSessionCookies, REFRESH_COOKIE } from "@/lib/session-cookies";
import { backendJson } from "@/lib/server-api";
import type { TokenResponse } from "@/lib/api";

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;

  if (refresh) {
    await backendJson("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    });
  }

  const response = NextResponse.json({ status: "logged_out" });
  clearSessionCookies(response);
  return response;
}
