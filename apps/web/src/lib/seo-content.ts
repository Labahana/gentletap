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

export const INVOICE_FOLLOW_UP_TEMPLATES = [
  {
    id: "due-date",
    title: "Friendly reminder on the due date",
    when: "Invoice due today",
    subject: "Invoice {{invoice_number}} — due today",
    body: `Hi {{client_name}},

Hope you're having a good week. Just a quick note that invoice {{invoice_number}} for {{amount}} is due today.

You can pay here: {{payment_link}}

Let me know if you have any questions about the line items — happy to clarify.

Thanks,
{{your_name}}`,
  },
  {
    id: "three-days",
    title: "Polite nudge — 3 days overdue",
    when: "3 days past due",
    subject: "Following up on invoice {{invoice_number}}",
    body: `Hi {{client_name}},

Wanted to check whether invoice {{invoice_number}} ({{amount}}, due {{due_date}}) landed on your side.

Payment link: {{payment_link}}

If anything's holding this up — PO number, approval, or a detail on the invoice — just reply and we'll sort it out.

Best,
{{your_name}}`,
  },
  {
    id: "seven-days",
    title: "Professional follow-up — 1 week overdue",
    when: "7 days past due",
    subject: "Invoice {{invoice_number}} — payment status",
    body: `Hi {{client_name}},

I'm following up on invoice {{invoice_number}} for {{amount}}, which was due {{due_date}}.

Pay online: {{payment_link}}

I know things get busy — if you need a copy resent or a small adjustment, let me know this week so we can close this out.

Thank you,
{{your_name}}`,
  },
  {
    id: "fourteen-days",
    title: "Firmer reminder — 2 weeks overdue",
    when: "14 days past due",
    subject: "Action needed: overdue invoice {{invoice_number}}",
    body: `Hi {{client_name}},

Invoice {{invoice_number}} for {{amount}} is now two weeks past due (original due date: {{due_date}}).

Please arrange payment at your earliest convenience: {{payment_link}}

If there's a dispute or you're waiting on internal approval, reply with a realistic payment date so I can update my records.

Regards,
{{your_name}}`,
  },
  {
    id: "thirty-days",
    title: "Final email before escalation",
    when: "30+ days past due",
    subject: "Final reminder — invoice {{invoice_number}}",
    body: `Hi {{client_name}},

This is a final courtesy reminder that invoice {{invoice_number}} for {{amount}} remains unpaid (due {{due_date}}).

Payment link: {{payment_link}}

I'd prefer to resolve this by email. Please confirm payment this week or let me know what's blocking it so we can agree on next steps.

Thanks,
{{your_name}}`,
  },
] as const;

export const TEMPLATE_TIPS = [
  "Reference the invoice number and amount every time — clients often have multiple open bills.",
  "Include a direct payment link (QuickBooks, Stripe, or bank details) so there's zero friction.",
  "Escalate tone gradually: warm → direct → firm. Sudden aggression damages repeat business.",
  "Send from your real email address, not a no-reply inbox — deliverability and trust are higher.",
  "Stop reminders the moment payment clears. Nothing annoys clients more than a chase after they've paid.",
] as const;

export const AFFILIATE_FAQ = [
  {
    q: "How much do GentleTap affiliates earn per referral?",
    a: "Affiliates earn 30% of every subscription payment for 24 months from each referred customer's first purchase. On the $19/mo Pro plan that's $5.70 per month — up to $136.80 per referral over the full commission window.",
  },
  {
    q: "Do referred customers get a discount?",
    a: "Yes. Visitors who sign up through an affiliate link receive 20% off their first 3 months on any paid plan (Pro, Pro+, or Team). The discount applies automatically at Paddle checkout — affiliates should mention it in videos and posts to improve conversions.",
  },
  {
    q: "Who is the GentleTap affiliate program for?",
    a: "YouTube creators, freelance business educators, newsletter writers, and bloggers whose audience uses QuickBooks or chases overdue invoices. We approve partners whose content genuinely helps freelancers get paid on time.",
  },
  {
    q: "Is GentleTap a good SaaS affiliate program for YouTube creators?",
    a: "Yes — if your audience invoices clients and uses QuickBooks Online. GentleTap solves a painful, searchable problem (overdue invoices), offers a free tier for easy trials, and pays 30% recurring commission for 24 months with a built-in audience discount to boost click-through.",
  },
  {
    q: "How does affiliate tracking work?",
    a: "You share your unique link (gentletap.co/?ref=yourcode). Clicks and signups are tracked for 30 days via cookie. When someone subscribes, commissions attach to your dashboard automatically through Paddle checkout.",
  },
  {
    q: "What is the affiliate cookie duration?",
    a: "30 days from the first click on your referral link. If someone returns within that window and creates an account, the referral is attributed to you (last valid affiliate link before signup wins).",
  },
  {
    q: "When and how do affiliates get paid?",
    a: "Commissions are paid monthly via PayPal on a net-30 schedule for all approved, pending earnings above the $50 minimum. View balances and payout history in your creator dashboard.",
  },
  {
    q: "Do I need to disclose affiliate links?",
    a: "Yes. FTC and platform rules require clear disclosure (e.g. 'I earn a commission if you sign up through my link'). All approved affiliates must follow our Affiliate Program Terms and include proper disclosure in videos, posts, and emails.",
  },
  {
    q: "Can I promote GentleTap if I'm already a customer?",
    a: "Yes. Many of our best affiliates are freelancers who use GentleTap themselves. Apply with your channel details — customer status is a plus, not a requirement.",
  },
  {
    q: "What happens if a referred customer refunds or cancels?",
    a: "Commissions are calculated on actual payments received. Refunds and chargebacks claw back the related commission. Commission stops when the customer cancels, downgrades to free, or after the 24-month window ends.",
  },
] as const;

export const AFFILIATE_AUDIENCE = [
  {
    title: "YouTube & video creators",
    body: "Finance, freelancing, and small-business channels whose viewers invoice through QuickBooks and struggle with late payments.",
  },
  {
    title: "Newsletter & blog educators",
    body: "Writers who teach invoicing, cash flow, or client management — GentleTap is an easy tool recommendation with real recurring commission.",
  },
  {
    title: "Course & community leaders",
    body: "Discord servers, cohort programs, and coaching communities full of independent consultants who need polite invoice follow-up automation.",
  },
] as const;

export const AFFILIATE_WHY_PROMOTE = [
  {
    title: "High-intent audience problem",
    body: "Your viewers already search for invoice follow-up templates and QuickBooks payment reminders — GentleTap is the paid upgrade from free advice.",
  },
  {
    title: "Free tier lowers friction",
    body: "Referred users can try GentleTap on up to 5 invoices with no credit card. You earn when they upgrade to Pro, Pro+, or Team.",
  },
  {
    title: "Audience discount converts",
    body: "Every affiliate link includes 20% off the first 3 months — a clear hook for descriptions: 'Use my link to save on automated invoice reminders.'",
  },
  {
    title: "24 months of recurring commission",
    body: "Unlike one-time bounty programs, you earn 30% on each renewal payment for two years per referred subscriber.",
  },
] as const;

export const AFFILIATE_PROGRAM_COMPARE = [
  { label: "Commission", gentletap: "30% recurring", typical: "One-time bounty or 10–20%" },
  { label: "Duration", gentletap: "24 months per referral", typical: "First payment only" },
  { label: "Audience offer", gentletap: "20% off first 3 months", typical: "None" },
  { label: "Cookie window", gentletap: "30 days", typical: "7–30 days" },
  { label: "Payout", gentletap: "PayPal, net 30", typical: "Varies" },
  { label: "Product fit", gentletap: "QuickBooks + Gmail freelancers", typical: "Generic SaaS" },
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
