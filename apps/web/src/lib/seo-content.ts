export const HOME_FAQ = [
  {
    q: "Will my clients know this is automated?",
    a: "Messages send from your Gmail or verified domain email, in your name. GentleTap drafts the follow-up; you approve before anything goes live. To your client, it reads like you.",
  },
  {
    q: "Does GentleTap work with QuickBooks Online?",
    a: "Yes. GentleTap syncs unpaid invoices from QuickBooks Online, detects when balances hit zero, and stops reminders automatically. We use read-only access — we never create or edit records in QuickBooks.",
  },
  {
    q: "What if I want to edit a message before it sends?",
    a: "You preview every draft during onboarding and can edit subject and body before approving. After go-live, you can pause any invoice or adjust upcoming reminders from your dashboard.",
  },
  {
    q: "Can I pause reminders for a specific client?",
    a: "Yes. Pause a single invoice anytime — for a client who's traveling, disputing a line item, or just needs space. Resume when you're ready.",
  },
  {
    q: "What happens when they pay?",
    a: "GentleTap syncs with QuickBooks. The moment an invoice balance hits zero, reminders for that invoice stop automatically.",
  },
  {
    q: "Is GentleTap only for US freelancers?",
    a: "No. GentleTap is built for freelancers, consultants, and small businesses globally. QuickBooks Online supports multiple currencies — reminders use your invoice currency and send from your own email address.",
  },
  {
    q: "How is this different from QuickBooks built-in payment reminders?",
    a: "QuickBooks can send basic invoice reminders. GentleTap adds AI-personalized follow-ups based on each client's history, multi-step sequences that escalate politely, Gmail sending in your voice, and WhatsApp on higher plans.",
  },
] as const;

export const SEO_FEATURES = [
  {
    title: "QuickBooks payment reminders on autopilot",
    body: "Sync unpaid invoices automatically. GentleTap watches balances and stops the moment QuickBooks shows payment received.",
  },
  {
    title: "AI invoice follow-ups that sound like you",
    body: "Each reminder references the invoice, amount, and how long it's been open — drafted in a warm, professional tone you can approve or edit.",
  },
  {
    title: "Send from Gmail or your domain",
    body: "Clients see your name and email address, not a generic collections inbox. Better deliverability, better relationships.",
  },
  {
    title: "Accounts receivable without awkward calls",
    body: "Escalating email sequences handle overdue invoice follow up so you don't have to chase clients manually or write the same message again.",
  },
] as const;

export const SEO_USE_CASES = [
  {
    title: "Freelancers & consultants",
    body: "Designers, developers, marketers, and advisors who invoice through QuickBooks and want to get paid faster without damaging client trust.",
  },
  {
    title: "Agencies & small teams",
    body: "Studios juggling multiple client invoices who need automated payment reminders with visibility across overdue accounts.",
  },
  {
    title: "International businesses",
    body: "Teams billing in USD, EUR, GBP, NGN, and other currencies — one workflow for polite invoice collection worldwide.",
  },
] as const;
