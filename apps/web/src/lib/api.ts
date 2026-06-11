// Browser: same-origin /v1 (proxied by Next.js) avoids mixed-content on HTTPS.
// Server: direct backend URL for SSR or non-proxied environments.
const API_URL =
  typeof window !== "undefined"
    ? ""
    : (process.env.API_PROXY_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8000");

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  persona: string | null;
  plan: string;
  onboarding_step: string;
  onboarding_completed_at: string | null;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type DecideResult = {
  action: string;
  channel?: string | null;
  tone?: string | null;
  reason?: string | null;
  message?: { subject: string; body: string } | null;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/v1${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg).join(", ")
          : "Request failed";
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  register: (body: { email: string; password: string; full_name?: string }) =>
    request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  me: (token: string) => request<User>("/auth/me", {}, token),

  onboardingStatus: (token: string) =>
    request<{ current_step: string; step_index: number; total_steps: number }>(
      "/onboarding/status",
      {},
      token,
    ),

  setPersona: (token: string, persona: string) =>
    request<User>("/onboarding/persona", {
      method: "POST",
      body: JSON.stringify({ persona }),
    }, token),

  previewIntelligence: () =>
    request<DecideResult>("/intelligence/preview", { method: "POST" }),

  qbConnectUrl: (token: string) =>
    request<{ authorization_url: string }>("/quickbooks/connect-url", {}, token),

  qbSyncStatus: (token: string) =>
    request<{
      status: string;
      progress: number;
      message: string;
      connected?: boolean;
      unpaid_count?: number;
      total_outstanding?: number;
    }>("/quickbooks/sync/status", {}, token),

  invoicesSummary: (token: string) =>
    request<{
      unpaid_count: number;
      overdue_count: number;
      total_outstanding: number;
      currency: string;
    }>("/invoices/summary", {}, token),
};

export const TOKEN_KEY = "gentletap_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
