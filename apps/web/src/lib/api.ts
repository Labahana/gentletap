// Browser: same-origin /v1 (proxied by Next.js) avoids mixed-content on HTTPS.
const API_URL =
  typeof window !== "undefined"
    ? ""
    : (process.env.API_PROXY_URL ?? "http://localhost:8000");

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
  refresh_token?: string | null;
  token_type: string;
};

export type InvoiceItem = {
  id: string;
  doc_number: string | null;
  client_name: string;
  client_email: string | null;
  amount: number;
  balance: number;
  currency: string;
  days_overdue: number;
  status: string;
  sequence_active: boolean;
  sequence_paused: boolean;
  sequence_step: number;
  due_date: string | null;
};

export type ReminderPreviewItem = {
  invoice_id: string;
  doc_number: string | null;
  client_name: string;
  balance: number;
  days_overdue: number;
  status: string;
  reminder_id?: string;
  subject?: string;
  body?: string;
  tone?: string;
  channel?: string;
  error?: string;
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
  if (res.status === 401 && typeof window !== "undefined") {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getToken()}`;
      const retry = await fetch(`${API_URL}/v1${path}`, { ...options, headers });
      if (!retry.ok) throw await parseError(retry);
      return retry.json() as Promise<T>;
    }
  }
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

async function parseError(res: Response): Promise<Error> {
  const err = await res.json().catch(() => ({ detail: res.statusText }));
  const detail = err.detail;
  const message =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: { msg?: string }) => d.msg).join(", ")
        : "Request failed";
  return new Error(message);
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  register: (body: { email: string; password: string; full_name?: string }) =>
    request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  me: (token: string) => request<User>("/auth/me", {}, token),

  onboardingStatus: (token: string) =>
    request<{ current_step: string; step_index: number; total_steps: number; completed: boolean }>(
      "/onboarding/status",
      {},
      token,
    ),

  setPersona: (token: string, persona: string) =>
    request<User>("/onboarding/persona", {
      method: "POST",
      body: JSON.stringify({ persona }),
    }, token),

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

  googleConnectUrl: (token: string) =>
    request<{ authorization_url: string }>("/google/connect-url", {}, token),

  emailStatus: (token: string) =>
    request<{ provider: string | null; ready: boolean; require_approval: boolean }>(
      "/email/status",
      {},
      token,
    ),

  verifyResendSender: (token: string, email: string) =>
    request<{ email: string; status: string; message: string }>(
      "/email/sender/verify",
      { method: "POST", body: JSON.stringify({ email }) },
      token,
    ),

  resendSenderStatus: (token: string) =>
    request<{ email?: string; verified: boolean; status?: string }>(
      "/email/sender/status",
      {},
      token,
    ),

  invoicesSummary: (token: string) =>
    request<{
      unpaid_count: number;
      overdue_count: number;
      total_outstanding: number;
      currency: string;
      green_count: number;
      yellow_count: number;
      red_count: number;
      active_sequences: number;
    }>("/invoices/summary", {}, token),

  invoices: (token: string, status?: string) =>
    request<{ items: InvoiceItem[]; total: number }>(
      `/invoices${status ? `?status=${status}` : ""}`,
      {},
      token,
    ),

  remindersPreview: (token: string) =>
    request<{ items: ReminderPreviewItem[]; count: number }>("/reminders/preview", {}, token),

  updateReminder: (token: string, id: string, body: { subject?: string; body?: string }) =>
    request<{ id: string; subject: string; body: string }>(
      `/reminders/${id}`,
      { method: "PUT", body: JSON.stringify(body) },
      token,
    ),

  approveAll: (token: string) =>
    request<{ activated: number; message: string }>(
      "/reminders/approve-all",
      { method: "POST" },
      token,
    ),

  pauseInvoice: (token: string, id: string) =>
    request<{ status: string }>(`/invoices/${id}/pause`, { method: "POST" }, token),

  resumeInvoice: (token: string, id: string) =>
    request<{ status: string }>(`/invoices/${id}/resume`, { method: "POST" }, token),

  invoiceDetail: (token: string, id: string) =>
    request<{
      id: string;
      doc_number: string | null;
      client: { name: string; email: string | null; phone: string | null };
      amount: number;
      balance: number;
      currency: string;
      days_overdue: number;
      status: string;
      sequence_active: boolean;
      sequence_paused: boolean;
      sequence_step: number;
      due_date: string | null;
      reminders: Array<{
        id: string;
        sequence_step: number;
        subject: string | null;
        body: string;
        status: string;
        sent_at: string | null;
        tone: string | null;
        channel: string;
      }>;
    }>(`/invoices/${id}`, {}, token),

  escalations: (token: string) =>
    request<{
      items: Array<{
        invoice_id: string;
        doc_number: string | null;
        client_name: string;
        balance: number;
        days_overdue: number;
        recommendation: string;
      }>;
    }>("/escalations", {}, token),

  markNotificationRead: (token: string, id: string) =>
    request<{ read: boolean }>(`/notifications/${id}/read`, { method: "POST" }, token),

  notifications: (token: string) =>
    request<{
      items: Array<{
        id: string;
        kind: string;
        title: string;
        body: string;
        invoice_id: string | null;
        read: boolean;
      }>;
    }>(
      "/notifications",
      {},
      token,
    ),

  billingStatus: (token: string) =>
    request<{
      plan: string;
      plan_display_name: string;
      checkout_available: boolean;
      plans: import("@/lib/pricing").PlanFeature[];
    }>("/billing/status", {}, token),

  billingCheckout: (
    token: string,
    plan: "pro" | "pro_plus" | "team",
    interval: "month" | "year" = "month",
  ) =>
    request<{ checkout_url: string }>(
      "/billing/checkout",
      { method: "POST", body: JSON.stringify({ plan, interval }) },
      token,
    ),

  billingPortal: (token: string) =>
    request<{ portal_url: string }>("/billing/portal", {}, token),
};

export const TOKEN_KEY = "gentletap_token";
export const REFRESH_KEY = "gentletap_refresh";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string | null) {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TokenResponse;
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}
