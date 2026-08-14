// Browser: same-origin /v1 (proxied by Next.js) avoids mixed-content on HTTPS.
import type {
  AdminAuditEntry,
  AdminJob,
  AdminOverview,
  AdminUserDetail,
  AdminUserListItem,
} from "./admin-types";
const API_URL =
  typeof window !== "undefined"
    ? ""
    : (process.env.API_PROXY_URL ?? "http://localhost:8000");

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  email_display_name: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  persona: string | null;
  plan: string;
  timezone: string;
  onboarding_step: string;
  onboarding_completed_at: string | null;
  account_role: string;
  account_owner_id: string | null;
};

export type TokenResponse = {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
};

export type CadenceStep = {
  day_offset: number;
  channel: "email" | "whatsapp" | "both" | "off";
  tone?: "soft" | "neutral" | "firm" | "final" | null;
  repeat_every_days?: number | null;
};

export type AutomationSettingsPayload = {
  cadence?: {
    steps: CadenceStep[];
    pre_due_enabled?: boolean;
    pre_due_days?: number[];
    thank_you_on_payment?: boolean;
  };
  autopilot?: boolean;
  timezone?: string;
  send_window?: { start: number; end: number; days: number[] };
  skip_weekends?: boolean;
  skip_holidays?: boolean;
  holidays_country?: string;
  pause_all?: boolean;
  pause_until?: string | null;
  pause_reason?: string | null;
  min_amount?: number | null;
  suppress_disputed?: boolean;
  suppress_on_reply?: boolean;
  stop_on_payment?: boolean;
  stop_on_claim?: boolean;
  whatsapp_delay_hours?: number;
  whatsapp_quiet_hours?: { start: number; end: number };
  signature_block?: string | null;
};

export type AutomationSettingsResponse = AutomationSettingsPayload & {
  meta: {
    allowed_channels: string[];
    allowed_tones: string[];
    max_steps: number;
    default_send_window: { start: number; end: number; days: number[] };
    default_quiet_hours: { start: number; end: number };
  };
};

export type NotificationPrefsResponse = {
  events: string[];
  channels: string[];
  prefs: Record<string, Record<string, boolean>>;
};

export type EscalationRule = {
  id: string;
  name: string;
  enabled: boolean;
  conditions: Record<string, number>;
  actions: Record<string, boolean>;
  position: number;
};

export type TeamOverview = {
  account_id: string;
  account_email: string;
  plan: string;
  seats_enabled: boolean;
  role: string;
  members: Array<{ id: string; user_id: string; email: string; full_name: string | null; role: string }>;
  invites: Array<{ id: string; email: string; role: string; expires_at: string | null }>;
};

export type AuditEvent = {
  id: string;
  action: string;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

export type UsageSummary = {
  plan: string;
  plan_display_name: string;
  collections: { used: number; limit: number | null; unlimited: boolean };
  whatsapp: {
    monthly_limit: number;
    monthly_used: number;
    monthly_remaining: number;
    extra_credits: number;
    total_remaining: number;
  } | null;
};

export type QbSyncStatus = {
  status: string;
  progress: number;
  message: string;
  connected?: boolean;
  unpaid_count?: number;
  total_outstanding?: number;
  last_sync_at?: string | null;
  auto_activated?: number;
};

export type FbSyncStatus = {
  status: string;
  progress: number;
  message: string;
  connected?: boolean;
  unpaid_count?: number;
  total_outstanding?: number;
  last_sync_at?: string | null;
  account_id?: string;
  business_name?: string | null;
  auto_activated?: number;
};

/** Fallback when FreshBooks status fetch fails (keeps Promise.all unions typed). */
export const IDLE_FB_SYNC_STATUS: FbSyncStatus = {
  status: "idle",
  progress: 0,
  message: "",
  connected: false,
  unpaid_count: 0,
  total_outstanding: 0,
  last_sync_at: null,
  account_id: undefined,
  business_name: null,
};

export type EmailDnsRecord = {
  type: string;
  host: string;
  value: string;
  priority?: number | null;
};

export type EmailSetupInfo = {
  provider: string | null;
  ready: boolean;
  platform_available: boolean;
  platform_from: string | null;
  platform_reply_to: string;
  domain_from_preview: string;
  google_connected: boolean;
  google_email: string | null;
  domain: {
    domain: string;
    status: string;
    verified: boolean;
    records: EmailDnsRecord[];
  } | null;
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
  dispute_flag?: boolean;
  due_date: string | null;
  chase_label?: "chasing" | "final_notice" | "paid" | "paused" | "disputed" | "queued" | "upcoming";
  status_text?: string;
  meta_line?: string;
  last_reminder_at?: string | null;
  last_reminder_channel?: string | null;
  payment_link?: string | null;
  source?: "quickbooks" | "freshbooks" | "upload";
  source_label?: string;
  needs_attention?: boolean;
  attention_reason?: string | null;
  attention_label?: string | null;
  reminder_phone?: string | null;
  effective_reminder_phone?: string | null;
  whatsapp_phone_missing?: boolean;
};

export type DashboardActivity = {
  kind: string;
  channel?: string | null;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  amount?: number | null;
  at: string;
  invoice_id?: string | null;
};

export type DashboardSummary = {
  unpaid_count: number;
  overdue_count: number;
  total_outstanding: number;
  oldest_days_overdue?: number;
  avg_days_overdue?: number;
  currency: string;
  green_count: number;
  yellow_count: number;
  red_count: number;
  active_sequences: number;
  collected_this_month?: number;
  expected_this_week?: number;
  expected_this_week_count?: number;
  avg_days_to_pay?: number | null;
  reminders_sent_this_month?: number;
  collection_rate?: number;
  response_rate?: number | null;
  time_saved_hours?: number;
  time_saved_value?: number;
  featured_escalation?: {
    invoice_id: string;
    client_name: string;
    balance: number;
    currency: string;
    reminders_sent: number;
    days_overdue: number;
    message: string;
  } | null;
  last_action?: {
    channel: string;
    client_name: string;
    doc_number: string | null;
    sent_at: string | null;
  } | null;
  activity?: DashboardActivity[];
  monthly_collections: {
    monthly_limit: number;
    monthly_used: number;
    monthly_remaining: number;
    cap_reached: boolean;
  } | null;
  aging?: {
    current: { count: number; total: number };
    days_1_30: { count: number; total: number };
    days_31_60: { count: number; total: number };
    days_61_90: { count: number; total: number };
    days_90_plus: { count: number; total: number };
  };
  collected_mom_pct?: number | null;
  collected_last_month?: number;
  avg_days_delta?: number | null;
  avg_days_last_month?: number | null;
  sources?: {
    quickbooks_count: number;
    freshbooks_count: number;
    upload_count: number;
    upload_needs_attention: number;
  };
};

export type ClientListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  risk_level: string;
  avg_days_to_pay: number | null;
  late_payment_rate: number;
  lifetime_value: number;
  tenure_months: number;
  preferred_channel: string;
  email_suppressed: boolean;
  do_not_contact?: boolean;
  channel_override?: string | null;
  timezone?: string | null;
  outstanding: number;
  unpaid_count: number;
  active_chase_count: number;
};

export type ClientDetail = ClientListItem & {
  communication_style: string;
  cadence_override?: { steps: CadenceStep[] } | null;
  invoices_paid_on_time: number;
  invoices_paid_late: number;
  invoices: Array<{
    id: string;
    doc_number: string | null;
    amount: number;
    balance: number;
    currency: string;
    days_overdue: number;
    status: string;
    sequence_active: boolean;
    due_date: string | null;
  }>;
};

export type AnalyticsData = {
  currency: string;
  total_clients: number;
  active_sequences: number;
  reminders_sent_this_month: number;
  paid_this_month: number;
  response_rate: number | null;
  collection_trend: Array<{ month: string; year: number; collected: number }>;
  reminders_by_channel: Record<string, number>;
  clients_by_risk: { low: number; medium: number; high: number };
  top_clients_outstanding: Array<{ id: string; name: string; outstanding: number }>;
  avg_days_to_pay?: number | null;
  collected_mom_pct: number | null;
  collected_last_month: number;
  avg_days_delta: number | null;
  avg_days_last_month: number | null;
};

export type ReminderPreviewItem = {
  invoice_id: string;
  doc_number: string | null;
  client_name: string;
  client_email?: string | null;
  balance: number;
  days_overdue: number;
  status: string;
  reminder_id?: string;
  subject?: string;
  body?: string;
  tone?: string;
  channel?: string;
  whatsapp_followup?: boolean;
  payment_link?: string | null;
  currency?: string;
  error?: string;
  tone_insight?: string;
  needs_firm_tone?: boolean;
};

export type ReminderPreviewSummary = {
  overdue_count: number;
  total_outstanding: number;
  oldest_days_overdue: number;
  avg_days_overdue: number;
};

type ActivationResult = {
  activated: number;
  message: string;
  skipped_escalation: Array<{ invoice_id: string; doc_number: string | null; reason: string }>;
  skipped_other: Array<{ invoice_id: string; doc_number: string | null; reason: string }>;
  plan_cap_total: number;
  plan_cap_remaining: number;
};

async function pollActivationResult(): Promise<ActivationResult> {
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await request<{
      status: string;
      result: ActivationResult | null;
      error: string | null;
    }>("/reminders/activate-status");
    if (status.status === "complete" && status.result) return status.result;
    if (status.status === "failed") throw new Error(status.error || "Activation failed");
  }
  throw new Error("Activation timed out — check your dashboard in a minute");
}

async function handleSessionExpired(): Promise<never> {
  // Public pages (landing, login, signup) probe /auth/me for guests — a 401 is
  // normal. Never clear cookies there: a late guest probe can race a successful
  // login/register and wipe the brand-new session.
  const currentPath = window.location.pathname;
  const isProtectedApp =
    currentPath.startsWith("/dashboard") ||
    currentPath.startsWith("/settings") ||
    currentPath.startsWith("/admin") ||
    currentPath.startsWith("/onboarding");
  if (isProtectedApp) {
    await clearSession();
    window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
  }
  throw new Error("Session expired — please log in again");
}

async function fetchWithRefresh(
  path: string,
  options: RequestInit,
  headers: Record<string, string>,
): Promise<Response> {
  const res = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (res.status !== 401) return res;
  const refreshed = await tryRefreshToken();
  if (!refreshed) await handleSessionExpired();
  const retry = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (retry.status === 401) await handleSessionExpired();
  return retry;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (typeof window === "undefined") {
    // Browser-only client — server code must use lib/server-api.ts (backendJson).
    throw new Error("lib/api request() called on the server");
  }
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };
  // Main app sessions use HttpOnly cookies injected by the /v1 proxy —
  // tokens are never read from JavaScript.
  const res = await fetchWithRefresh(path, options, headers);
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

  register: async (body: { email: string; password: string; full_name?: string; ref_code?: string }) => {
    const res = await fetch("/api/session/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await parseError(res);
    return res.json() as Promise<{ user: User }>;
  },

  login: async (body: { email: string; password: string }) => {
    const res = await fetch("/api/session/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await parseError(res);
    return res.json() as Promise<{ user: User }>;
  },

  googleAuthUrl: (intent: "signup" | "login" = "signup") =>
    request<{ authorization_url: string }>(`/auth/google/url?intent=${intent}`),

  googleAuthExchange: async (code: string) => {
    const res = await fetch("/api/session/google", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) throw await parseError(res);
    return res.json() as Promise<{ user: User }>;
  },

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  me: () => request<User>("/auth/me", {}),

  logout: async () => {
    await fetch("/api/session/logout", { method: "POST", credentials: "include" });
    return { status: "logged_out" };
  },

  onboardingStatus: () =>
    request<{ current_step: string; step_index: number; total_steps: number; completed: boolean }>(
      "/onboarding/status", {},
    ),

  setPersona: (persona: string) =>
    request<User>("/onboarding/persona", {
      method: "POST",
      body: JSON.stringify({ persona }),
    }),

  saveOnboardingProfile: (
    body: {
      company_name: string;
      email_display_name?: string;
      phone?: string;
      website?: string;
      logo_url?: string | null;
    },
  ) =>
    request<User>("/onboarding/profile", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  advanceOnboardingQuickbooks: () =>
    request<{ current_step: string }>("/onboarding/advance-quickbooks", { method: "POST" }),

  advanceOnboardingImport: () =>
    request<{ current_step: string }>("/onboarding/advance-import", { method: "POST" }),

  importInvoicesCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{
      imported: number;
      skipped: number;
      total_outstanding: number;
      columns_found: string[];
      auto_activated?: number;
    }>("/invoices/import", { method: "POST", body: form });
  },

  createInvoice: (payload: {
    client_name: string;
    client_email: string;
    amount: number;
    due_date: string;
    client_phone?: string;
    doc_number?: string;
    currency?: string;
    invoice_date?: string;
    payment_link?: string;
  }) =>
    request<{ id: string; invoice: unknown }>("/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  advanceOnboardingEmail: () =>
    request<{ current_step: string }>("/onboarding/advance-email", { method: "POST" }),

  advanceOnboardingPricing: () =>
    request<{ current_step: string }>("/onboarding/advance-pricing", { method: "POST" }),

  onboardingActivate: async () => {
    const res = await request<{
      status: string;
      result: ActivationResult | null;
      error: string | null;
    }>("/onboarding/activate", { method: "POST" });
    // First batch runs in-request; only poll when overflow batches are queued.
    if (res.status === "complete" && res.result) return res.result;
    if (res.status === "failed") throw new Error(res.error || "Activation failed");
    return pollActivationResult();
  },

  qbConnectUrl: () =>
    request<{ authorization_url: string }>("/quickbooks/connect-url", {}),

  qbSyncStatus: () =>
    request<QbSyncStatus>("/quickbooks/sync/status", {}),

  fbConnectUrl: () =>
    request<{ authorization_url: string }>("/freshbooks/connect-url", {}),

  fbSyncStatus: () =>
    request<FbSyncStatus>("/freshbooks/sync/status", {}),

  fbSync: () =>
    request<{ status: string; message: string }>("/freshbooks/sync", { method: "POST" }),

  fbDisconnect: () =>
    request<{ status: string }>("/freshbooks/disconnect", { method: "POST" }),

  googleConnectUrl: (returnTo: "onboarding" | "settings" = "onboarding") =>
    request<{ authorization_url: string }>(
      `/google/connect-url?return_to=${returnTo}`, {},
    ),

  googleStatus: () =>
    request<{ connected: boolean; email?: string }>("/google/status", {}),

  googleDisconnect: () =>
    request<{ status: string }>("/google/disconnect", { method: "POST" }),

  emailStatus: () =>
    request<{ provider: string | null; ready: boolean; require_approval: boolean }>(
      "/email/status", {},
    ),

  emailSetup: () => request<EmailSetupInfo>("/email/setup", {}),

  enablePlatformEmail: () =>
    request<{ provider: string; from: string; reply_to: string }>("/email/platform", { method: "POST" }),

  startEmailDomain: (domain_or_email: string) =>
    request<{ domain: string; status: string; records: EmailDnsRecord[] }>(
      "/email/domain",
      { method: "POST", body: JSON.stringify({ domain_or_email }) },
    ),

  verifyEmailDomain: () =>
    request<{ domain: string; status: string; verified: boolean; records: EmailDnsRecord[] }>(
      "/email/domain/verify",
      { method: "POST" },
    ),

  continueEmailDomain: () =>
    request<{ provider: string; domain: string; status: string }>(
      "/email/domain/continue",
      { method: "POST" },
    ),

  cancelEmailDomain: () =>
    request<{ status: string }>("/email/domain", { method: "DELETE" }),

  verifyResendSender: (email: string) =>
    request<{ email: string; status: string; message: string }>(
      "/email/sender/verify",
      { method: "POST", body: JSON.stringify({ email }) },
    ),

  resendSenderStatus: () =>
    request<{ email?: string; verified: boolean; status?: string }>(
      "/email/sender/status", {},
    ),

  invoicesSummary: () =>
    request<DashboardSummary>("/invoices/summary", {}),

  invoices: (status?: string) =>
    request<{ items: InvoiceItem[]; total: number }>(
      `/invoices${status ? `?status=${status}` : ""}`, {},
    ),

  clients: () =>
    request<{ items: ClientListItem[]; total: number }>("/clients", {}),

  clientDetail: (id: string) =>
    request<ClientDetail>(`/clients/${id}`, {}),

  analytics: () => request<AnalyticsData>("/analytics", {}),

  remindersPreview: () =>
    request<{ items: ReminderPreviewItem[]; count: number; summary: ReminderPreviewSummary }>(
      "/reminders/preview", {},
    ),

  updateReminder: (id: string, body: { subject?: string; body?: string }) =>
    request<{ id: string; subject: string; body: string }>(
      `/reminders/${id}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),

  approveAll: async () => {
    const res = await request<{
      status: string;
      result: ActivationResult | null;
      error: string | null;
    }>("/reminders/approve-all", { method: "POST" });
    if (res.status === "complete" && res.result) return res.result;
    if (res.status === "failed") throw new Error(res.error || "Activation failed");
    return pollActivationResult();
  },

  approveInvoice: (id: string) =>
    request<{ status: string }>(`/invoices/${id}/approve`, { method: "POST" }),

  markDispute: (id: string) =>
    request<{ status: string }>(`/invoices/${id}/dispute`, { method: "POST" }),

  clearDispute: (id: string) =>
    request<{ status: string }>(`/invoices/${id}/clear-dispute`, { method: "POST" }),

  qbSync: () =>
    request<{ status: string; message: string }>("/quickbooks/sync", { method: "POST" }),

  qbDisconnect: () =>
    request<{ status: string }>("/quickbooks/disconnect", { method: "POST" }),

  updateEmailPreferences: (send_provider: "google" | "resend") =>
    request<{ send_provider: string }>(
      "/email/preferences",
      { method: "PUT", body: JSON.stringify({ send_provider }) },
    ),

  pauseInvoice: (id: string) =>
    request<{ status: string }>(`/invoices/${id}/pause`, { method: "POST" }),

  resumeInvoice: (id: string) =>
    request<{ status: string }>(`/invoices/${id}/resume`, { method: "POST" }),

  markInvoicePaid: (id: string) =>
    request<{ status: string; balance: number }>(`/invoices/${id}/mark-paid`, { method: "POST" }),

  updateInvoice: (
    id: string,
    body: { balance?: number; due_date?: string; payment_link?: string; clear_payment_link?: boolean },
  ) =>
    request<{ status: string; balance: number; due_date: string | null; payment_link: string | null }>(
      `/invoices/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),

  updateInvoiceContacts: (
    id: string,
    body: { reminder_phone?: string; clear_reminder_phone?: boolean; client_email?: string },
  ) =>
    request<{
      status: string;
      reminder_email: string | null;
      reminder_phone: string | null;
      effective_reminder_phone: string | null;
      whatsapp_phone_missing: boolean;
      client: { email: string | null; phone: string | null };
    }>(`/invoices/${id}/contacts`, { method: "PATCH", body: JSON.stringify(body) }),

  bulkMarkInvoicesPaid: (invoiceIds: string[]) =>
    request<{ paid_count: number; paid: string[]; errors: Array<{ invoice_id: string; error: string }> }>(
      "/invoices/bulk-mark-paid",
      { method: "POST", body: JSON.stringify({ invoice_ids: invoiceIds }) },
    ),

  importHistory: () =>
    request<{
      items: Array<{
        id: string;
        filename: string;
        imported_count: number;
        skipped_count: number;
        total_outstanding: number;
        columns_found: string[];
        created_at: string;
      }>;
    }>("/invoices/import-history", {}),

  updateClient: (
    id: string,
    body: {
      email?: string;
      phone?: string;
      do_not_contact?: boolean;
      channel_override?: "email" | "whatsapp" | "both" | "off" | null;
      timezone?: string | null;
    },
  ) =>
    request<ClientDetail>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  invoiceDetail: (id: string) =>
    request<{
      id: string;
      doc_number: string | null;
      client: { id: string | null; name: string; email: string | null; phone: string | null };
      reminder_email: string | null;
      reminder_phone: string | null;
      effective_reminder_phone: string | null;
      whatsapp_phone_missing: boolean;
      amount: number;
      balance: number;
      currency: string;
      days_overdue: number;
      status: string;
      sequence_active: boolean;
      sequence_paused: boolean;
      sequence_step: number;
      dispute_flag: boolean;
      due_date: string | null;
      payment_link: string | null;
      source: "quickbooks" | "freshbooks" | "upload";
      source_label: string;
      needs_attention: boolean;
      attention_reason: string | null;
      attention_label: string | null;
      imported_at: string | null;
      last_manual_update_at: string | null;
      client_claimed_paid_at: string | null;
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
    }>(`/invoices/${id}`, {}),

  escalations: () =>
    request<{
      items: Array<{
        invoice_id: string;
        doc_number: string | null;
        client_name: string;
        balance: number;
        days_overdue: number;
        recommendation: string;
      }>;
    }>("/escalations", {}),

  markNotificationRead: (id: string) =>
    request<{ read: boolean }>(`/notifications/${id}/read`, { method: "POST" }),

  notifications: () =>
    request<{
      items: Array<{
        id: string;
        kind: string;
        title: string;
        body: string;
        invoice_id: string | null;
        read: boolean;
        created_at?: string | null;
      }>;
    }>(
      "/notifications", {},
    ),

  billingStatus: () =>
    request<{
      plan: string;
      plan_display_name: string;
      checkout_available: boolean;
      paddle: { client_token?: string | null; environment: "sandbox" | "production" };
      plans: import("@/lib/pricing").PlanFeature[];
    }>("/billing/status", {}),

  billingCheckout: (
    plan: "pro" | "pro_plus" | "team",
    interval: "month" | "year" = "month",
    returnTo: "billing" | "onboarding" = "billing",
  ) =>
    request<{ checkout_url: string; transaction_id: string }>(
      "/billing/checkout",
      { method: "POST", body: JSON.stringify({ plan, interval, return_to: returnTo }) },
    ),

  billingPortal: () =>
    request<{ portal_url: string }>("/billing/portal", {}),

  whatsappStatus: () =>
    request<{
      plan_eligible: boolean;
      connected: boolean;
      mode: string | null;
      status: string | null;
      platform_configured: boolean;
      shared_available: boolean;
      shared_sender: string | null;
      monthly_limit: number;
      monthly_used: number;
      monthly_remaining: number;
      extra_credits: number;
      total_remaining: number;
      cap_reached: boolean;
    }>("/whatsapp/status", {}),

  whatsappConnectShared: () =>
    request<{ connected: boolean; mode: string; message: string }>(
      "/whatsapp/connect/shared",
      { method: "POST" },
    ),

  whatsappDisconnect: () =>
    request<{ connected: boolean }>("/whatsapp/disconnect", { method: "POST" }),

  whatsappCheckoutMessages: (pack: "pack_250" | "pack_500") =>
    request<{ checkout_url: string; transaction_id: string }>(
      "/whatsapp/checkout-messages",
      { method: "POST", body: JSON.stringify({ pack }) },
    ),

  whatsappInbound: () =>
    request<{
      items: Array<{
        id: string;
        from_phone: string;
        body: string;
        invoice_id: string | null;
        created_at: string | null;
      }>;
    }>("/whatsapp/inbound", {}),

  updateProfile: (body: {
    full_name?: string;
    persona?: string;
    company_name?: string;
    email_display_name?: string;
    phone?: string;
    website?: string;
    logo_url?: string | null;
    timezone?: string;
  }) =>
    request<{
      id: string;
      email: string;
      full_name: string | null;
      persona: string | null;
      plan: string;
      timezone: string;
      onboarding_step: string;
      onboarding_completed_at: string | null;
    }>("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),

  changeEmail: (newEmail: string, currentPassword: string) =>
    request<{ email: string }>("/auth/change-email", {
      method: "POST",
      body: JSON.stringify({ new_email: newEmail, current_password: currentPassword }),
    }),

  // Control Center
  automationSettings: () => request<AutomationSettingsResponse>("/automation", {}),

  updateAutomation: (body: Partial<AutomationSettingsPayload>) =>
    request<AutomationSettingsResponse>("/automation", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  pauseAll: (opts?: { pause_until?: string; reason?: string }) =>
    request<{ paused: boolean; pause_until: string | null }>("/automation/pause-all", {
      method: "POST",
      body: JSON.stringify(opts ?? {}),
    }),

  resumeAll: () =>
    request<{ paused: boolean }>("/automation/resume-all", { method: "POST" }),

  notificationPreferences: () =>
    request<NotificationPrefsResponse>("/notification-preferences", {}),

  updateNotificationPreferences: (prefs: Record<string, Record<string, boolean>>) =>
    request<{ prefs: Record<string, Record<string, boolean>> }>("/notification-preferences", {
      method: "PUT",
      body: JSON.stringify({ prefs }),
    }),

  escalationRules: () => request<{ items: EscalationRule[] }>("/escalation-rules", {}),

  saveEscalationRule: (rule: Partial<EscalationRule> & { name: string }) =>
    request<EscalationRule>(
      rule.id ? `/escalation-rules/${rule.id}` : "/escalation-rules",
      { method: rule.id ? "PATCH" : "POST", body: JSON.stringify(rule) },
    ),

  deleteEscalationRule: (id: string) =>
    request<void>(`/escalation-rules/${id}`, { method: "DELETE" }),

  teamOverview: () => request<TeamOverview>("/team", {}),

  createTeamInvite: (email: string, role: "member" | "viewer") =>
    request<{ id: string; email: string; role: string; accept_url: string }>("/team/invites", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  removeTeamMember: (memberUserId: string) =>
    request<void>(`/team/members/${memberUserId}`, { method: "DELETE" }),

  teamAudit: () => request<{ items: AuditEvent[] }>("/team/audit", {}),

  usageSummary: () => request<UsageSummary>("/usage", {}),

  changePassword: async (currentPassword: string, password: string) => {
    const res = await fetch("/api/session/change-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, password }),
    });
    if (!res.ok) throw await parseError(res);
    return res.json() as Promise<{ message: string }>;
  },

  exportAccountData: async () => {
    const res = await fetchWithRefresh("/auth/me/export", {}, {});
    if (!res.ok) throw await parseError(res);
    const blob = await res.blob();
    downloadBlob(blob, "gentletap-data-export.json");
  },

  exportClientData: async (clientId: string) => {
    const res = await fetchWithRefresh(`/privacy/clients/${clientId}/export`, {}, {});
    if (!res.ok) throw await parseError(res);
    const blob = await res.blob();
    downloadBlob(blob, `client-${clientId}-export.json`);
  },

  deleteAccount: (confirmation: string) =>
    request<{ message: string }>(
      "/auth/delete-account",
      { method: "POST", body: JSON.stringify({ confirmation }) },
    ),

  adminMe: () =>
    request<{ admin: boolean; email: string; id: string }>("/admin/me", {}),

  adminOverview: () => request<AdminOverview>("/admin/overview", {}),

  adminHealth: () =>
    request<{ status: string; checks: Record<string, string> }>("/admin/health", {}),

  adminUsers: (
    params?: {
      search?: string;
      plan?: string;
      onboarding_step?: string;
      limit?: number;
      offset?: number;
    },
  ) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.plan) q.set("plan", params.plan);
    if (params?.onboarding_step) q.set("onboarding_step", params.onboarding_step);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return request<{
      items: AdminUserListItem[];
      total: number;
      limit: number;
      offset: number;
    }>(`/admin/users${qs ? `?${qs}` : ""}`, {});
  },

  adminUserDetail: (userId: string) =>
    request<AdminUserDetail>(`/admin/users/${userId}`, {}),

  adminJobs: (status = "failed") =>
    request<{ items: AdminJob[]; status_filter: string; limit: number }>(
      `/admin/jobs?status=${encodeURIComponent(status)}`, {},
    ),

  adminAudit: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return request<{ items: AdminAuditEntry[]; total: number; limit: number; offset: number }>(
      `/admin/audit${qs ? `?${qs}` : ""}`, {},
    );
  },

  adminSyncQb: (userId: string) =>
    request<{ status: string }>(`/admin/users/${userId}/sync-qb`, { method: "POST" }),

  adminSyncFb: (userId: string) =>
    request<{ status: string }>(`/admin/users/${userId}/sync-fb`, { method: "POST" }),

  adminPauseReminders: (userId: string) =>
    request<{ status: string; invoices_paused?: number; jobs_cancelled?: number }>(
      `/admin/users/${userId}/pause-reminders`,
      { method: "POST" },
    ),

  adminRequeueJob: (jobId: string) =>
    request<{ status: string }>(`/admin/jobs/${jobId}/requeue`, { method: "POST" }),

  adminRequeueStuck: () =>
    request<{ requeued: number }>("/admin/jobs/requeue-stuck", { method: "POST" }),

  adminAffiliates: (
    params?: { status?: string; limit?: number; offset?: number },
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return request<{
      items: Array<{
        id: string;
        name: string;
        email: string;
        status: string;
        ref_code: string | null;
        channel_name: string | null;
        partner_type: string;
        commission_rate: number;
        signups: number;
        active_subscribers: number;
        lifetime_earnings: number;
        created_at: string;
        approved_at: string | null;
      }>;
      total: number;
    }>(`/affiliates/admin/list${qs ? `?${qs}` : ""}`, {});
  },

  adminAffiliateDetail: (affiliateId: string) =>
    request<Record<string, unknown>>(`/affiliates/admin/${affiliateId}`, {}),

  adminApproveAffiliate: (affiliateId: string, ref_code?: string, commission_rate?: number) =>
    request<{ status: string; ref_code: string; commission_rate: number }>(
      `/affiliates/admin/${affiliateId}/approve`,
      {
        method: "POST",
        body: JSON.stringify({
          ref_code: ref_code ?? null,
          commission_rate: commission_rate ?? null,
        }),
      },
    ),

  adminRejectAffiliate: (affiliateId: string) =>
    request<{ status: string }>(`/affiliates/admin/${affiliateId}/reject`, { method: "POST" }),

  adminPauseAffiliate: (affiliateId: string) =>
    request<{ status: string }>(`/affiliates/admin/${affiliateId}/pause`, { method: "POST" }),

  adminAffiliatePayout: (
    affiliateId: string,
    body: {
      amount: number;
      method?: string;
      reference?: string;
      notes?: string;
      allow_below_minimum?: boolean;
    },
  ) =>
    request<{ id: string; amount: number; status: string }>(
      `/affiliates/admin/${affiliateId}/payout`,
      { method: "POST", body: JSON.stringify(body) },
    ),
};

export const TOKEN_KEY = "gentletap_token";
export const REFRESH_KEY = "gentletap_refresh";

/** @deprecated Tokens live in HttpOnly cookies. Use `useAuth().user` for session guards. */
export function getToken(): string | null {
  return null;
}

/** @deprecated Refresh token is HttpOnly — not readable from JavaScript. */
export function getRefreshToken(): string | null {
  return null;
}

/** @deprecated No-op — session cookies are set by /api/session/* route handlers. */
export function setTokens(...args: [string, (string | null | undefined)?]) {
  void args;
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}

/** Clear any legacy localStorage tokens from before the cookie migration. */
export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}

async function clearSession() {
  clearToken();
  try {
    await fetch("/api/session/logout", { method: "POST", credentials: "include" });
  } catch {
    // ignore
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch("/api/session/refresh", {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
