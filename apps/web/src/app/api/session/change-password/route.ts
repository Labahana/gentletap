import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE, applySessionCookies } from "@/lib/session-cookies";
import { backendJson } from "@/lib/server-api";
import type { TokenResponse, User } from "@/lib/api";

type ChangePasswordBody = { current_password: string; password: string };

export async function POST(request: NextRequest) {
  let body: ChangePasswordBody;
  try {
    body = (await request.json()) as ChangePasswordBody;
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }

  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const me = await backendJson<User>("/auth/me", {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!me.ok) {
    return NextResponse.json({ detail: me.detail }, { status: me.status });
  }

  const changed = await backendJson<{ message: string }>("/auth/change-password", {
    method: "POST",
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify(body),
  });
  if (!changed.ok) {
    return NextResponse.json({ detail: changed.detail }, { status: changed.status });
  }

  // The backend revokes every refresh token on password change — mint a fresh
  // pair so this session survives instead of dying at the next refresh.
  const tokens = await backendJson<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: me.data.email, password: body.password }),
  });
  if (!tokens.ok || !tokens.data.access_token) {
    return NextResponse.json({ detail: changed.data.message });
  }

  const response = NextResponse.json({ message: changed.data.message });
  applySessionCookies(response, tokens.data);
  return response;
}
