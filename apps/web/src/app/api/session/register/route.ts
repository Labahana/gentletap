import { NextRequest, NextResponse } from "next/server";

import { applySessionCookies } from "@/lib/session-cookies";
import { backendJson } from "@/lib/server-api";
import type { TokenResponse, User } from "@/lib/api";

type RegisterBody = {
  email: string;
  password: string;
  full_name?: string;
  ref_code?: string;
};

export async function POST(request: NextRequest) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }

  const tokens = await backendJson<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!tokens.ok) {
    return NextResponse.json({ detail: tokens.detail }, { status: tokens.status });
  }
  if (!tokens.data.access_token) {
    return NextResponse.json({ detail: "Authentication service error" }, { status: 502 });
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
