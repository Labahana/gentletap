export type Stats = {
  total_orgs: number;
  total_users: number;
  mrr: number;
  active_connections: number;
  messages_sent_today: number;
  signups_7d: number;
  signups_30d: number;
  collections_recovered_30d: number;
  pending_jobs: number;
  stuck_jobs: number;
  failed_jobs_24h: number;
  subscription_health: {
    active: number;
    past_due: number;
    canceled: number;
    trialing: number;
    pending_setup: number;
  };
};

export type Timeseries = { days: string[]; signals: { signups: number[]; messages: number[] } };

export type Health = { api: string; db: string; redis: string; celery: string };

export type Deliverability = {
  days: number;
  channels: Array<{
    channel: string;
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    bounced: number;
    delivery_rate: number;
    failure_rate: number;
  }>;
};

export type OrgRow = {
  id: string;
  name: string;
  plan: string;
  billing_period: string | null;
  owner_email: string | null;
  operation_mode: string | null;
  paused: boolean;
  collections_used: number;
  collections_quota: number;
  whatsapp_used: number;
  whatsapp_quota: number;
  created_at: string;
};

export type OrgDetail = {
  org: {
    id: string;
    name: string;
    plan: string;
    billing_period: string | null;
    seats_limit: number;
    paddle_customer_id: string | null;
    collections_used: number;
    collections_quota: number;
    whatsapp_used: number;
    whatsapp_quota: number;
    deletion_requested_at: string | null;
    created_at: string;
  };
  owner: { id: string; email: string; full_name: string | null } | null;
  settings: {
    operation_mode: string | null;
    pause_all: boolean;
    pause_until: string | null;
    pause_reason: string | null;
  };
  connections: Array<{
    id: string;
    provider: string;
    status: string;
    last_sync_at: string | null;
    token_expires_at: string | null;
    token_expiring_soon: boolean;
    token_expired: boolean;
  }>;
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  counts: {
    invoices_total: number;
    invoices_unpaid: number;
    invoices_chasing: number;
    invoices_paid: number;
    unpaid_open: number;
    unpaid_amount: number;
    messages: number;
    pending_jobs: number;
  };
};

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_deleting: boolean;
  created_at: string;
  deleted_at: string | null;
  orgs: Array<{ id: string; name: string; plan: string }>;
};

export type UserDetail = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_deleting: boolean;
  created_at: string;
  deleted_at: string | null;
  gdpr_consent_at: string | null;
  orgs: Array<{
    id: string;
    name: string;
    plan: string;
    collections_used: number;
    collections_quota: number;
    whatsapp_used: number;
    whatsapp_quota: number;
    deletion_requested_at: string | null;
  }>;
};

export type JobRow = {
  id: string;
  org_id: string;
  org_name: string | null;
  invoice_id: string;
  invoice_number: string | null;
  sequence_step: number;
  scheduled_for: string;
  status: string;
  attempts: number;
  last_error: string | null;
  updated_at: string;
  stuck: boolean;
};

export type JobsPage = {
  total: number;
  counts: Record<string, number>;
  items: JobRow[];
};

export type AuditRow = {
  id: string;
  org_id: string | null;
  actor_type: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
};

export type Page<T> = { total: number; items: T[] };
