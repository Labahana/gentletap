import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE } from "@/lib/session-cookies";

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "expect",
  // Session cookies must not leak to the API (auth goes via injected Bearer).
  "cookie",
  // Forwarded headers are set by nginx; do not pass through client-supplied values.
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-forwarded-host",
  "x-real-ip",
]);

const PROXY_TIMEOUT_MS = 30_000;

function getApiProxyUrl(): string {
  const configured = process.env.API_PROXY_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return "http://api:8000";
  }

  return "http://localhost:8000";
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  const base = getApiProxyUrl();
  const target = new URL(`/v1/${path.join("/")}`, `${base}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  // Inject auth from HttpOnly session cookie when the client did not send Authorization.
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (access && !headers.has("authorization")) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    credentials: "include",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const response = await fetch(target, { ...init, signal: controller.signal });
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      responseHeaders.set(key, value);
    });
    // Headers.forEach skips set-cookie; forward each one individually.
    for (const cookie of response.headers.getSetCookie()) {
      responseHeaders.append("set-cookie", cookie);
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("API proxy error:", {
      target: target.toString(),
      proxyUrl: base,
      error,
    });
    return NextResponse.json(
      { detail: "Service temporarily unavailable" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
