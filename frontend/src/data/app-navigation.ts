/**
 * Authoritative map of where everything lives in the GentleTap app and on the
 * public site, plus exact step-by-step how-tos.
 *
 * This is the single source of truth the support chatbot is grounded on for
 * "where do I…" / "how do I…" questions, so it names the real pages and buttons
 * instead of guessing menu paths. Keep it in sync with the actual UI:
 *   - sidebar + routes: frontend/src/components/Sidebar.tsx and App.tsx
 *   - connect/sync:     frontend/src/pages/Integrations.tsx
 *   - profile/notify:   frontend/src/pages/Settings.tsx
 * Regenerate the chatbot pack after editing:  npm run gen:chat-knowledge
 */

type Section = { heading: string; paragraphs: string[] };

export const APP_NAVIGATION: {
  inApp: Section[];
  howTo: Section[];
  publicSite: Section[];
} = {
  inApp: [
    {
      heading: "Signed-in app layout",
      paragraphs: [
        "Everything in the app is reached from the left sidebar. It is grouped into: a main row, 'Autopilot output', 'Content', and 'Account'. The page you are currently on is shown to the assistant, so it can tell you what to click next.",
      ],
    },
    {
      heading: "Main row",
      paragraphs: [
        "Dashboard (/dashboard) — overview: autopilot status, collection chart, recent sends, and an escalations preview.",
        "Autopilot (/autopilot) — the control center. Turn autopilot on or off, and set cadence, guardrails, send windows, escalation rules, sender identity and autonomy level. Chasing rules live here, not in Settings.",
        "Approvals (/approvals) — AI-drafted reminders waiting for your OK (only appears when approval gates are turned on).",
        "Escalations (/escalations) — invoices GentleTap flagged as needing your attention.",
      ],
    },
    {
      heading: "'Autopilot output' group",
      paragraphs: [
        "Invoices (/invoices) — every synced or imported invoice. Here you can add an invoice manually, import a CSV/Excel file, and start or stop a reminder sequence on any invoice. Each invoice opens a detail page (/invoices/:id).",
        "Clients (/clients) — your customer list; each client has a detail page (/clients/:id).",
        "Send History (/history) — a log of every reminder email and WhatsApp message sent, with its status.",
        "Payouts (/payouts) — affiliate payouts.",
        "Analytics (/analytics) — collection performance and response rates.",
      ],
    },
    {
      heading: "'Content' group",
      paragraphs: [
        "Sequences (/sequences) — the multi-step reminder sequences (timing and steps); each sequence has a detail page (/sequences/:id).",
        "Voice & Templates (/templates) — the AI writing voice and your email/WhatsApp templates.",
      ],
    },
    {
      heading: "'Account' group",
      paragraphs: [
        "Billing (/billing) — your plan, invoices, payment method, and upgrade/downgrade.",
        "Team (/team) — invite and manage members and roles.",
        "Settings (/settings) — Profile & Organization (your name, organization name, email signature, timezone), Reminder Defaults (stop-after days, contact window 8am–9pm, send thank-you after payment), Notifications (daily digest, payment alerts, escalation alerts), and Data & Privacy (export data, delete account). Settings does NOT contain connections/integrations.",
        "Integrations (/integrations) — THIS is where you connect and sync accounts: Google/Gmail (send from your own inbox), QuickBooks Online (auto-sync unpaid invoices), FreshBooks (auto-sync clients and balances), and CSV/Excel upload. Connect buttons and 'Sync Now' live on this page.",
      ],
    },
    {
      heading: "Support",
      paragraphs: [
        "'Help & Docs' at the bottom of the sidebar opens this assistant. A human teammate can take over from the chat at any time.",
      ],
    },
  ],

  howTo: [
    {
      heading: "How to connect FreshBooks",
      paragraphs: [
        "Click Integrations in the left sidebar (under 'Account'). In the FreshBooks card click 'Connect FreshBooks', approve the FreshBooks OAuth permission window, and you'll be returned to the Integrations page showing 'Connected'. To pull the latest invoices and balances afterwards, click 'Sync Now' on the FreshBooks card. Note: it is on the Integrations page — there is no 'Connections' item inside Settings.",
      ],
    },
    {
      heading: "How to connect QuickBooks Online",
      paragraphs: [
        "Sidebar → Integrations → on the QuickBooks Online card click 'Connect QuickBooks', approve the QuickBooks OAuth window, then use 'Sync Now' to import unpaid invoices and customers.",
      ],
    },
    {
      heading: "How to connect Gmail (send reminders from your own inbox)",
      paragraphs: [
        "Sidebar → Integrations → on the Google / Gmail card click 'Connect Gmail via Google' and approve the Google permission window. Once connected, reminders are sent from your Gmail and the card shows 'Ready for sending'.",
      ],
    },
    {
      heading: "How to add invoices without accounting software",
      paragraphs: [
        "Sidebar → Invoices. Use the CSV/Excel import to upload many at once (you can include a client phone number for WhatsApp and a payment link per invoice), or add a single invoice manually. The Integrations page also links to the CSV import.",
      ],
    },
    {
      heading: "How to turn on autopilot",
      paragraphs: [
        "Sidebar → Autopilot. Enable it and set the cadence and guardrails you want. GentleTap then chases unpaid invoices automatically and stops as soon as a balance is paid.",
      ],
    },
    {
      heading: "How to change reminder wording or templates",
      paragraphs: [
        "Sidebar → Voice & Templates to edit the AI voice and email/WhatsApp templates. To change the timing and number of follow-ups, go to Sidebar → Sequences.",
      ],
    },
    {
      heading: "How to update your signature, timezone or notifications",
      paragraphs: [
        "Sidebar → Settings. Email signature and timezone are under Profile & Organization; daily digest, payment and escalation alerts are under Notifications.",
      ],
    },
    {
      heading: "How to upgrade, downgrade or view billing",
      paragraphs: [
        "Sidebar → Billing. Plan limits and pricing are also shown at gentletap.co/pricing.",
      ],
    },
    {
      heading: "How to export your data or delete your account",
      paragraphs: [
        "Sidebar → Settings → Data & Privacy. 'Export data' emails you a download; 'Delete account' schedules deletion with a 30-day grace period.",
      ],
    },
  ],

  publicSite: [
    {
      heading: "Public website (no login needed)",
      paragraphs: [
        "Home (/) — product overview. Pricing (/pricing) — plans and limits. Features (/features and /features/:slug). Compare (/compare and /compare/:slug) — GentleTap vs alternatives such as Chasivo and DueDrop. Industries (/industries/:slug). Blog (/blog and /blog/:slug).",
        "Guides: /quickbooks-payment-reminders, /freshbooks-invoice-reminders, /xero-invoice-reminders, /quickbooks-invoice-automation, /quickbooks-reminders-vs-gentletap, /invoice-follow-up-guide, /how-to-follow-up-on-overdue-invoices, /invoice-follow-up-email-templates-for-freelancers.",
        "Affiliates: /affiliates (program), /affiliates/dashboard, /affiliates/resources, /affiliates/terms. Sign in: /login, /signup. Legal: /privacy, /terms, /cookies, /refund.",
      ],
    },
  ],
};
