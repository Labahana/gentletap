import { NextRequest, NextResponse } from "next/server";

import { applySessionCookies } from "@/lib/session-cookies";
import { backendJson } from "@/lib/server-api";
import type { TokenResponse, User } from "@/lib/api";

export async function POST(request: NextRequest) {
  let body: { code: string };
  try {
    body = (await request.json()) as { code: string };
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }

  const tokens = await backendJson<TokenResponse>("/auth/google/exchange", {
    method: "POST",
    body: JSON.stringify({ code: body.code }),
  });
  if (!tokens.ok) {
    return NextResponse.json({ detail: tokens.detail }, { status: tokens.status });
  }

  const me = await backendJson<User>("/auth/me", {
    headers: { Authorization: `Bearer ${tokens.data.access_token}` },
  });
  if (!me.ok) {
    return NextResponse.json({ detail: me.detail }, { status: me.status });
  }

  const response = NextResponse.json({ user: me.data });
  applySessionCookies(response, tokens.data);
  return response;
}
