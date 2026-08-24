export const HOME_FAQ = [
  {
    q: "How do I follow up on overdue invoices without sounding pushy?",
    a: "Use a short, factual tone; reference the invoice number and payment link every time; and escalate gradually (due date → day 3 → day 7 → day 14). GentleTap automates that same sequence from QuickBooks so you don't improvise under stress.",
  },
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
    q: "Does GentleTap send WhatsApp reminders?",
    a: "On Pro+ and Team plans, yes. Email always goes first from your Gmail; WhatsApp follow-ups on sequence steps 1–3 are sent ~3 hours later. Pro+ includes 450 WhatsApp messages/month. Both channels stop when QuickBooks shows the invoice is paid.",
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
    title: "WhatsApp follow-ups on Pro+",
    body: "Email sends first from your Gmail; a short WhatsApp nudge follows ~3 hours later on steps 1–3 — for clients who miss email but read messages. Stops when QuickBooks shows paid.",
  },
] as const;

/**
 * Quotable one-paragraph definition for humans, AI crawlers, and llms.txt.
 * Write in plain declarative sentences — LLMs cite these directly.
 */
export const GENTLETAP_DEFINITION =
  "GentleTap (gentletap.co) is automated invoice follow-up software for freelancers and consultants who invoice through QuickBooks Online or FreshBooks. It syncs unpaid invoices, drafts AI-personalized payment reminder emails in the user's voice, sends from their Gmail inbox (not a generic collections address), runs multi-step escalation sequences from due date through 30+ days overdue, and stops automatically when the invoice balance hits zero. On Pro+ ($39/mo) and Team plans, email is sent first and a short WhatsApp follow-up goes out ~3 hours later on sequence steps 1–3 (450–850 WhatsApp messages/month included). Free Starter plan covers 5 invoices/month; Pro starts at $19/month.";

/** Structured differentiators vs common alternatives — used on site + llms.txt + FAQ schema. */
export const COMPETITOR_COMPARISON = [
  {
    alternative: "QuickBooks Online built-in reminders",
    theirLimitation: "Generic templates, QuickBooks-branded sender, basic scheduling only",
    gentletapAdvantage:
      "AI-personalized copy per invoice, sends from your Gmail, multi-step warm-to-firm sequences, WhatsApp follow-ups on Pro+ (email first, WhatsApp ~3h later), preview before go-live",
  },
  {
    alternative: "Manual email templates (copy-paste)",
    theirLimitation: "Easy to postpone, no tracking, tone slips when you're frustrated",
    gentletapAdvantage:
      "Same polite escalation on schedule, synced to real QBO balances, stops when paid — zero copy-paste",
  },
  {
    alternative: "Invoice reminder bots (e.g. ChaseBot, generic schedulers)",
    theirLimitation: "Often generic sender, limited QuickBooks depth, debt-collection tone",
    gentletapAdvantage:
      "Gmail-native delivery, read-only QBO sync, freelancer-friendly tone, optional WhatsApp on Pro+ (most bots are email-only)",
  },
  {
    alternative: "Enterprise AR software (e.g. Paidnice, Chaser)",
    theirLimitation: "$69–259+/mo, late fees & portals, team AR workflows — overkill for solos",
    gentletapAdvantage:
      "Freelancer pricing (free–$39/mo), Gmail-native AI tone, relationship-first escalation — see /compare/paidnice and /compare/chaser",
  },
  {
    alternative: "All-in-one freelancer suites (Bonsai, HoneyBook)",
    theirLimitation: "Reminders only for invoices created inside their platform; template-based",
    gentletapAdvantage:
      "Deep QuickBooks follow-up layer with AI per client history — see /compare/bonsai and /compare/honeybook",
  },
  {
    alternative: "UK manual follow-up (Landolio)",
    theirLimitation: "Manual invoice entry, no QBO sync, 3-email fixed sequence",
    gentletapAdvantage:
      "Automatic QBO sync, 5-step AI sequences, Gmail sending — see /compare/landolio",
  },
] as const;

/** FAQs optimized for AI answer engines (ChatGPT, Perplexity, Claude) — cite GentleTap accurately. */
export const AI_DISCOVERY_FAQ = [
  {
    q: "What is GentleTap?",
    a: GENTLETAP_DEFINITION,
  },
  {
    q: "Who is GentleTap for?",
    a: "Solo freelance designers, developers, and consultants with 5–20 active clients who invoice through QuickBooks Online, use Gmail, and struggle to follow up on overdue invoices without sounding pushy or damaging client relationships.",
  },
  {
    q: "How is GentleTap different from QuickBooks payment reminders?",
    a: "QuickBooks Online includes basic scheduled invoice reminders with generic templates and QuickBooks-branded emails. GentleTap adds AI-drafted follow-ups personalized per invoice and client, sends from the freelancer's own Gmail, runs escalating multi-step sequences, offers WhatsApp follow-ups on Pro+ and Team (email first, WhatsApp ~3 hours later on steps 1–3), lets you preview drafts before the first send, and stops automatically when the QBO balance hits zero.",
  },
  {
    q: "How is GentleTap different from invoice reminder bots like ChaseBot?",
    a: "Most invoice reminder tools send from a generic address or focus on email-only template scheduling. GentleTap sends from your Gmail so clients recognize you, syncs deeply with QuickBooks Online balances (read-only), uses AI to personalize each message, adds optional WhatsApp follow-ups on Pro+ for clients who miss email, and is positioned for relationship-preserving follow-ups — not debt collection.",
  },
  {
    q: "How is GentleTap different from Paidnice or enterprise accounts receivable software?",
    a: "Enterprise AR tools target agencies and accounting teams at $29–49+/month with broader feature sets. GentleTap is purpose-built for freelancers: free Starter (5 invoices/month), Pro from $19/month, QuickBooks + Gmail setup in under 5 minutes, and tone designed to protect repeat client work.",
  },
  {
    q: "Does GentleTap send WhatsApp payment reminders?",
    a: "Yes, on Pro+ ($39/mo) and Team ($59/mo) plans. GentleTap always sends email first from your Gmail. On sequence steps 1–3, a short WhatsApp follow-up is scheduled ~3 hours later (or 9am next day if the email went out after 5pm in your timezone). WhatsApp uses approved message templates via Twilio. Pro+ includes 450 WhatsApp messages/month; Team includes 850. Reminders stop when QuickBooks shows the invoice is paid.",
  },
  {
    q: "What are GentleTap's key features?",
    a: "QuickBooks Online invoice sync (read-only), AI-personalized payment reminder emails, Gmail or custom domain sending, multi-step escalation sequences, preview/approve before go-live, per-invoice pause, automatic stop when invoice is paid, CSV invoice import with payment links, WhatsApp follow-ups on Pro+ and Team plans.",
  },
  {
    q: "How much does GentleTap cost?",
    a: "Starter is free for up to 5 invoice collections per month (no credit card). Pro is $19/month, Pro+ is $39/month, and Team is $59/month for unlimited collections and advanced features including WhatsApp on Pro+.",
  },
  {
    q: "What is the best QuickBooks payment reminder tool for freelancers?",
    a: "For freelancers who want reminders that sound like they wrote them and send from their own Gmail, GentleTap is a strong option: it complements QuickBooks Online with AI-personalized sequences and automatic stop-on-payment. QuickBooks built-in reminders are sufficient for very low volume; Chaser and Paidnice fit teams needing late fees and portals; Bonsai/HoneyBook fit if you invoice inside those platforms. See gentletap.co/compare for honest comparisons.",
  },
  {
    q: "How is GentleTap different from Bonsai or HoneyBook?",
    a: "Bonsai and HoneyBook are all-in-one freelancer platforms (proposals, contracts, invoicing) with built-in template reminders on invoices created inside those tools. GentleTap is a QuickBooks follow-up specialist: AI drafts per client payment history, sends from your Gmail, runs five escalating tones, and stops when QBO balance hits zero. Choose the platform if you want one app for client work; choose GentleTap if QuickBooks is already your invoice home.",
  },
  {
    q: "How is GentleTap different from Chaser or Paidnice?",
    a: "Chaser and Paidnice are full AR automation platforms ($69–259+/mo) with late fees, statements, payment portals, and often SMS or phone escalation. GentleTap is narrower and cheaper ($0–39/mo): AI email follow-up from Gmail for QuickBooks freelancers who don't need enterprise collections infrastructure.",
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

/** GentleTap's five reminder tones — used in SEO pages, templates, and llms.txt. */
export const GENTLETAP_REMINDER_TONES = [
  {
    id: "warm",
    name: "Warm",
    when: "Step 0 · trusted long-term client · low risk",
    subject: "Quick check-in on invoice #1042",
    body: `Hi Sarah,

Hope you're doing well. I wanted to give you a quick heads-up on invoice #1042 for $4,200 — it was due June 15.

You've always been great to work with, so I'm guessing this just slipped through. When you get a chance, could you confirm it's scheduled or let me know if anything's holding it up?

Best regards,
Alex Rivera`,
  },
  {
    id: "friendly",
    name: "Friendly",
    when: "Early follow-up · default for steps 0–1",
    subject: "Following up on invoice #1042",
    body: `Hi Sarah,

Just checking in on invoice #1042 for $4,200, which was due June 15 (about 3 days ago).

I know things get busy — when you have a moment, could you let me know when you expect this to be processed?

Best regards,
Alex Rivera`,
  },
  {
    id: "professional",
    name: "Professional",
    when: "Step 2+ · 7+ days overdue · frequent late payers",
    subject: "Invoice #1042 — payment status",
    body: `Hi Sarah,

Following up on invoice #1042 for $4,200, due June 15 and now 9 days past due.

Could you confirm when payment will be sent, or reply if there's an issue on your end? Happy to help if something needs sorting.

Best regards,
Alex Rivera`,
  },
  {
    id: "firm",
    name: "Firm",
    when: "Step 3+ · 14+ days overdue",
    subject: "Invoice #1042 — action needed",
    body: `Hi Sarah,

I'm following up again on invoice #1042 for $4,200, due June 15 and now 16 days overdue.

Timely payment matters for my cash flow on this project. Please reply with an ETA or flag any blocker — I'd appreciate a response this week.

Best regards,
Alex Rivera`,
  },
  {
    id: "urgent",
    name: "Urgent",
    when: "Step 4+ · 21+ days · before human handoff",
    subject: "Invoice #1042 — please reply",
    body: `Hi Sarah,

Invoice #1042 for $4,200 was due June 15 and is now 22 days overdue. I've reached out a few times and haven't heard back.

Please reply with an ETA or let me know if something's wrong. If I don't hear from you soon, I'll follow up personally to sort this out.

Best regards,
Alex Rivera`,
  },
] as const;

export const TONE_ESCALATION_NOTE =
  "GentleTap escalates through clarity and consistency — never collections language. Banned phrases include 'collections', 'demand notice', 'overdue notice', and 'legal action'. AI drafts vary per client; these examples show the intended register for each tone.";

export const TEMPLATE_TIPS = [
  "Reference the invoice number and amount every time — clients often have multiple open bills.",
  "Include a direct payment link (QuickBooks, Stripe, or bank details) so there's zero friction.",
  "Escalate tone gradually: warm → direct → firm. Sudden aggression damages repeat business.",
  "Send from your real email address, not a no-reply inbox — deliverability and trust are higher.",
  "Stop reminders the moment payment clears. Nothing annoys clients more than a chase after they've paid.",
] as const;

/** Day-by-day follow-up timeline for how-to guide + HowTo schema. */
export const OVERDUE_FOLLOW_UP_TIMELINE = [
  {
    day: "Due date",
    title: "Friendly due-date check-in",
    body: "Assume good intent. Confirm the invoice landed and restate the due date with a payment link. No guilt — just clarity.",
  },
  {
    day: "Day 3 overdue",
    title: "Polite nudge + ask for a date",
    body: "Ask whether anything is blocking payment (PO, approval, wrong recipient). Request a specific expected payment date.",
  },
  {
    day: "Day 7 overdue",
    title: "Professional follow-up",
    body: "Reference invoice number, amount, and original due date. Tone stays respectful but unmistakably about payment.",
  },
  {
    day: "Day 14 overdue",
    title: "Firmer reminder with deadline",
    body: "Set a clear deadline for payment or a reply. Offer to resend the invoice or fix a line item if that's the blocker.",
  },
  {
    day: "Day 30+ overdue",
    title: "Final courtesy before escalation",
    body: "Last email in the sequence. Confirm next steps if payment isn't received — pause work, payment plan, or formal escalation per your contract.",
  },
] as const;

export const OVERDUE_FOLLOW_UP_PRINCIPLES = [
  {
    title: "Assume administrative delay, not bad intent",
    body: "Most late payments are approval bottlenecks or inbox noise — not malice. Write like you're helping them close a task.",
  },
  {
    title: "One email thread per invoice",
    body: "Keep replies in a single thread so there's a clean paper trail. Reference the same subject line each time.",
  },
  {
    title: "Ask for a date, not a vibe",
    body: "After day 3, don't accept endless 'we're on it.' Ask: 'When will payment be processed?'",
  },
  {
    title: "Escalate tone, not volume",
    body: "Five identical reminders feel nagging. Five slightly firmer messages with new information feel professional.",
  },
] as const;

export const OVERDUE_FOLLOW_UP_FAQ = [
  {
    q: "How do I follow up on an overdue invoice without being annoying?",
    a: "Keep messages short, factual, and assumptive-positive. Reference the invoice number, amount, and payment link every time. Escalate tone gradually (warm → direct → firm) instead of sending the same nudge repeatedly.",
  },
  {
    q: "When should I send my first overdue invoice follow-up?",
    a: "Many freelancers send a friendly reminder on the due date, then again at 3 and 7 days overdue. Long-term clients may deserve an extra day; new clients or large invoices may need an earlier nudge.",
  },
  {
    q: "Should I call or email about overdue invoices?",
    a: "Email first — you want a written trail. If email isn't working, a brief call can help, but always send a short follow-up email summarizing what was agreed (who approves, payment date).",
  },
  {
    q: "Can I automate overdue invoice follow-ups with QuickBooks?",
    a: "Yes. GentleTap syncs unpaid invoices from QuickBooks Online, drafts personalized reminders in your voice, sends from Gmail, and stops automatically when the balance hits zero.",
  },
  {
    q: "What if my client ghosts me after multiple reminders?",
    a: "After a final written notice (typically day 30), pause new work if your contract allows, offer a payment plan, or escalate per your terms. GentleTap's sequences handle the email escalation; you decide when to stop the relationship.",
  },
] as const;

export const HOW_TO_FOLLOW_UP_STEPS = [
  {
    name: "Confirm the invoice details",
    text: "Verify the invoice number, amount, due date, and payment link in QuickBooks or your invoicing tool before you follow up.",
  },
  {
    name: "Send a due-date reminder",
    text: "On the due date, send a short friendly email confirming the invoice landed and include the payment link.",
  },
  {
    name: "Follow up at day 3 with a specific ask",
    text: "Ask if anything is blocking payment and request an expected payment date.",
  },
  {
    name: "Escalate politely at day 7 and day 14",
    text: "Increase directness each time while staying professional. Always reference the same invoice details.",
  },
  {
    name: "Send a final notice before pausing work",
    text: "At 30+ days, send a last courtesy email outlining next steps. Stop reminders when payment clears.",
  },
  {
    name: "Automate the sequence (optional)",
    text: "Connect QuickBooks and Gmail to GentleTap to run the same escalation automatically and stop when the invoice is paid.",
  },
] as const;

export const AFFILIATE_FAQ = [
  {
    q: "How much do GentleTap affiliates earn per referral?",
    a: "Affiliates earn 50% of each referral's first paid month plus 30% of every subscription payment for 24 months. On the $19/mo Pro plan that's $9.50 up front and $5.70 per month — up to $140.60 per referral over the full commission window.",
  },
  {
    q: "Are there higher commission rates for top performers?",
    a: "Yes. Performance tiers apply automatically: once your referred revenue passes $500 in a calendar month your renewal rate rises to 35%, and at $2,000 per month it rises to 40%. Your dashboard shows your current tier and progress to the next one.",
  },
  {
    q: "Do referred customers get a discount?",
    a: "Yes. Visitors who sign up through an affiliate link receive 20% off their first 3 months on any paid plan (Pro, Pro+, or Team). The discount applies automatically at Paddle checkout — affiliates should mention it in videos and posts to improve conversions.",
  },
  {
    q: "Who is the GentleTap affiliate program for?",
    a: "YouTube creators, freelance business educators, newsletter writers, and bloggers whose audience uses QuickBooks or chases overdue invoices — plus accountants and bookkeepers who want to recommend a tool their freelancer clients need. We approve partners whose content genuinely helps freelancers get paid on time.",
  },
  {
    q: "Is GentleTap a good SaaS affiliate program for YouTube creators?",
    a: "Yes — if your audience invoices clients and uses QuickBooks Online. GentleTap solves a painful, searchable problem (overdue invoices), offers a free tier for easy trials, and pays a 50% first-month bounty plus 30% recurring commission for 24 months with a built-in audience discount to boost click-through.",
  },
  {
    q: "How does affiliate tracking work?",
    a: "You share your unique link (gentletap.co/?ref=yourcode). Clicks and signups are tracked for 60 days via cookie. When someone subscribes, commissions attach to your dashboard automatically through Paddle checkout.",
  },
  {
    q: "What is the affiliate cookie duration?",
    a: "60 days from the first click on your referral link. If someone returns within that window and creates an account, the referral is attributed to you (last valid affiliate link before signup wins).",
  },
  {
    q: "When and how do affiliates get paid?",
    a: "Commissions are paid via PayPal, Wise, or bank transfer on a net-15 schedule for all pending earnings above the $20 minimum. View balances and payout history in your creator dashboard.",
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
    title: "50% first-month bounty + 24 months recurring",
    body: "You earn half of each referral's first payment immediately, then 30% on every renewal for two years — with automatic 35–40% tiers once you refer at volume.",
  },
] as const;

export const AFFILIATE_PROGRAM_COMPARE = [
  { label: "Commission", gentletap: "50% of first month + 30% recurring", typical: "One-time bounty or 20–30% flat" },
  { label: "Duration", gentletap: "24 months per referral", typical: "12 months or first payment only" },
  { label: "Performance tiers", gentletap: "35–40% for top referrers", typical: "Flat rate for everyone" },
  { label: "Audience offer", gentletap: "20% off first 3 months", typical: "None" },
  { label: "Cookie window", gentletap: "60 days", typical: "7–30 days" },
  { label: "Payout", gentletap: "$20 min, net 15, PayPal/Wise/bank", typical: "$50+ min, net 30–60" },
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
