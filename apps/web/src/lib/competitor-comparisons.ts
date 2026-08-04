/** Honest competitor comparison data for SEO pages — updated periodically. */

export type ComparisonRow = {
  feature: string;
  competitor: string;
  gentletap: string;
};

export type CompetitorComparison = {
  slug: string;
  name: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  keywords: readonly string[];
  category: string;
  competitorSummary: string;
  gentletapSummary: string;
  whenTheyWin: string;
  whenGentletapWins: string;
  honestVerdict: string;
  pricingNote: string;
  comparisonRows: readonly ComparisonRow[];
  faq: readonly { q: string; a: string }[];
  competitorUrl?: string;
};

export const COMPETITOR_SLUGS = [
  "chasivo",
  "bonsai",
  "chaser",
  "melio",
  "invoice-dunning",
  "invoicechaser",
  "landolio",
  "paidnice",
  "honeybook",
  "duedrop",
  "nudgepe",
  "freshbooks",
  "invoicesherpa",
  "upflow",
  "satago",
  "chaseai",
  "wave",
] as const;

export type CompetitorSlug = (typeof COMPETITOR_SLUGS)[number];

export const COMPETITOR_COMPARISONS: Record<CompetitorSlug, CompetitorComparison> = {
  chasivo: {
    slug: "chasivo",
    name: "Chasivo",
    tagline: "Promised integrations vs live QuickBooks + FreshBooks sync",
    metaTitle: "GentleTap vs Chasivo — Invoice Chasing Compared (2026)",
    metaDescription:
      "Honest Chasivo vs GentleTap comparison. Both use AI drafts and Gmail sending. GentleTap has live QuickBooks + FreshBooks sync and WhatsApp today; Chasivo lists those as coming soon. Pricing and fit explained.",
    keywords: [
      "GentleTap vs Chasivo",
      "Chasivo alternative",
      "Chasivo vs GentleTap",
      "invoice chasing software comparison",
      "AI invoice chasing software",
    ],
    category: "AI invoice chasing (closest feature competitor)",
    competitorUrl: "https://chasivo.com/",
    competitorSummary:
      "Chasivo is AI invoice-chasing software that drafts follow-ups in your voice, sends from Gmail/Outlook, scores invoice risk 0–100, builds customer payment profiles, and offers Autopilot / Copilot / Manual modes. Accounting sync (QuickBooks, FreshBooks, Xero, Wave) and WhatsApp are listed as coming soon on their pricing page — today they rely on CSV import and their own invoice management. Solo is $19/mo; Pro $39/mo; Business $69/mo.",
    gentletapSummary:
      "GentleTap is the same category — AI drafts shaped by client history and risk, Gmail-native sending, multi-step escalation — but with live QuickBooks Online and FreshBooks sync already shipping, WhatsApp follow-ups live on Pro+ ($39/mo), and a free Starter plan that includes real AI collections (5/month), not just a UI preview.",
    whenTheyWin:
      "Choose Chasivo if you want built-in invoicing + cash-flow forecasting in one product, Outlook/SMTP sending, Twilio SMS reminders, or Autopilot/Copilot/Manual modes per customer — and you're fine importing invoices via CSV until their accounting integrations ship.",
    whenGentletapWins:
      "Choose GentleTap if QuickBooks or FreshBooks is already your source of truth and you refuse to re-enter invoices. You get live balance sync, auto-stop when paid, WhatsApp live today (not on a roadmap), and full multi-channel AI follow-up at Pro+ for a flat $39/mo.",
    honestVerdict:
      "Chasivo and GentleTap are the closest products in this space — both AI + Gmail + client intelligence. The decisive difference today is delivery vs promises: GentleTap ships QBO + FreshBooks sync and WhatsApp now; Chasivo lists those as coming soon and leads with CSV + its own invoice tool. If you already invoice in accounting software, GentleTap is the lighter, live-integrated layer. If you want a standalone AR app with forecasting and SMS while you wait on sync, Chasivo is a fair pick.",
    pricingNote:
      "Chasivo: Free (3 customers / 10 invoices, no AI drafts), Solo $19/mo, Pro $39/mo, Business $69/mo (verify on chasivo.com). GentleTap: free Starter (5 AI collections/mo), Pro $19/mo, Pro+ $39/mo with WhatsApp + priority AI, Team $59/mo.",
    comparisonRows: [
      { feature: "Primary job", competitor: "AI chasing + own invoicing + forecasts", gentletap: "AI chasing layer on your accounting" },
      { feature: "QuickBooks sync", competitor: "Coming soon", gentletap: "Live now (read-only)" },
      { feature: "FreshBooks sync", competitor: "Coming soon", gentletap: "Live now (read-only)" },
      { feature: "Invoice data today", competitor: "CSV import + create invoices in-app", gentletap: "Live sync from QBO/FreshBooks (+ CSV)" },
      { feature: "AI drafts", competitor: "Yes — history + tone modes", gentletap: "Yes — client profile + overdue stage" },
      { feature: "Risk scoring", competitor: "0–100 per invoice", gentletap: "Yes — risk level drives tone" },
      { feature: "Send from your email", competitor: "Gmail + Outlook (+ SMTP on Business)", gentletap: "Gmail (+ verified custom domain)" },
      { feature: "WhatsApp", competitor: "Coming soon", gentletap: "Live on Pro+ ($39) and Team" },
      { feature: "SMS", competitor: "Twilio SMS on paid plans", gentletap: "No — email + WhatsApp only" },
      { feature: "Stop when paid", competitor: "Yes (in-app status)", gentletap: "Yes — live balance sync" },
      { feature: "Free tier that actually chases", competitor: "Preview only — no AI drafts / sending", gentletap: "Starter — 5 AI collections/mo" },
      { feature: "Full AI + WhatsApp price", competitor: "Pro $39/mo (WhatsApp still coming)", gentletap: "Pro+ $39/mo (WhatsApp live)" },
    ],
    faq: [
      {
        q: "Is GentleTap better than Chasivo?",
        a: "If you invoice in QuickBooks or FreshBooks and want live sync plus WhatsApp today, yes. If you want standalone invoicing, SMS, Outlook, and cash-flow scenario modelling while accounting sync is still on their roadmap, Chasivo may fit better.",
      },
      {
        q: "Does Chasivo sync with QuickBooks?",
        a: "Not yet — their pricing page lists QuickBooks, FreshBooks, Xero, and Wave as coming soon. GentleTap's QuickBooks and FreshBooks sync are live.",
      },
      {
        q: "Both charge $39 for a mid tier — what's the difference?",
        a: "Chasivo Pro ($39) adds forecasting and view-only seats; WhatsApp is still coming soon. GentleTap Pro+ ($39) is the full follow-up product: priority AI drafts plus live WhatsApp on steps 1–3 (450 msgs/mo).",
      },
      {
        q: "Does GentleTap have Autopilot / Copilot / Manual modes?",
        a: "GentleTap runs autonomous sequences with preview/approve before go-live, per-invoice pause, and escalation recommendations on Pro+. It doesn't brand three named modes the way Chasivo does — the practical outcome (draft → review → autopilot) is the same idea.",
      },
    ],
  },

  bonsai: {
    slug: "bonsai",
    name: "Bonsai",
    tagline: "All-in-one freelancer business suite vs payment follow-up specialist",
    metaTitle: "GentleTap vs Bonsai — Invoice Reminders Compared (2026)",
    metaDescription:
      "Honest comparison: Bonsai is an all-in-one freelancer platform with invoicing and basic reminders. GentleTap is QuickBooks-native AI follow-up from your Gmail. See which fits your workflow.",
    keywords: [
      "GentleTap vs Bonsai",
      "Bonsai payment reminders alternative",
      "Bonsai invoice follow up",
      "QuickBooks reminder tool vs Bonsai",
    ],
    category: "All-in-one freelancer platform",
    competitorUrl: "https://www.hellobonsai.com/invoicing",
    competitorSummary:
      "Bonsai bundles proposals, contracts, time tracking, invoicing, and automated payment reminders into one freelancer workspace. Invoices can sync two-way with QuickBooks Online and Xero. Reminders are built into Bonsai's own invoicing flow — not a layer on top of QuickBooks invoices you already created elsewhere.",
    gentletapSummary:
      "GentleTap does one job deeply: chase overdue QuickBooks Online invoices with AI-personalized email (and optional WhatsApp on Pro+) sent from your Gmail. It does not replace proposals, contracts, or time tracking.",
    whenTheyWin:
      "Choose Bonsai if you want to run your entire freelance business — proposals through payment — in one tool and you're willing to invoice primarily through Bonsai (with optional QBO sync). Bonsai's reminders work well for invoices created inside Bonsai.",
    whenGentletapWins:
      "Choose GentleTap if QuickBooks Online is already your source of truth for invoicing and you only need smarter, escalating follow-ups that send from your real Gmail address — without migrating billing into another platform.",
    honestVerdict:
      "These tools solve different problems. Bonsai is a business OS; GentleTap is an AR follow-up layer for QuickBooks users. If you invoice in QuickBooks and only need reminders, GentleTap is the lighter, cheaper fit. If you want Bonsai's full client lifecycle in one app, Bonsai's built-in reminders may be enough — though they are template-based, not AI-personalized per client history.",
    pricingNote:
      "Bonsai: from ~$15/user/mo (monthly) or ~$9/user/mo (annual) on Basic; higher tiers add team and premium features. Payment processing fees apply separately. GentleTap: free Starter (5 collections/mo), Pro $19/mo, Pro+ $39/mo with WhatsApp.",
    comparisonRows: [
      { feature: "Primary purpose", competitor: "Full freelancer business suite", gentletap: "QuickBooks payment follow-up only" },
      { feature: "Where invoices live", competitor: "Bonsai (syncs to QBO/Xero)", gentletap: "QuickBooks Online (read-only sync)" },
      { feature: "Reminder personalization", competitor: "Template-based, customizable", gentletap: "AI drafts per invoice + client history" },
      { feature: "Send from your Gmail", competitor: "Bonsai-branded invoice emails", gentletap: "Yes — your Gmail address" },
      { feature: "Proposals & contracts", competitor: "Yes — core product", gentletap: "No" },
      { feature: "WhatsApp follow-ups", competitor: "No", gentletap: "Yes — Pro+ and Team" },
      { feature: "Stop when paid", competitor: "Yes (within Bonsai)", gentletap: "Yes — syncs QBO balance" },
    ],
    faq: [
      {
        q: "Can I use GentleTap and Bonsai together?",
        a: "Yes, if you invoice through QuickBooks (synced from Bonsai or created directly in QBO). GentleTap reads unpaid QBO invoices — it does not read Bonsai invoices that never sync to QuickBooks.",
      },
      {
        q: "Is Bonsai cheaper than GentleTap?",
        a: "Bonsai Basic starts around $9–15/user/month depending on billing cycle. GentleTap Starter is free for 5 collections/month; Pro is $19/mo. Bonsai costs more overall because you're paying for the full suite, not just reminders.",
      },
      {
        q: "Which has better payment reminders?",
        a: "For QuickBooks-native follow-up with AI personalization and Gmail sending, GentleTap. For reminders on invoices you create inside an all-in-one freelancer tool, Bonsai is simpler — you never leave one app.",
      },
    ],
  },

  chaser: {
    slug: "chaser",
    name: "Chaser",
    tagline: "Enterprise AR automation vs freelancer-friendly follow-up",
    metaTitle: "GentleTap vs Chaser — QuickBooks AR Reminders Compared",
    metaDescription:
      "Honest Chaser vs GentleTap comparison. Chaser is full credit-control software with SMS, calls, and payment portals. GentleTap is AI follow-up from Gmail for solo freelancers. Pricing and fit explained.",
    keywords: [
      "GentleTap vs Chaser",
      "Chaser alternative for freelancers",
      "Chaser QuickBooks pricing",
      "Chaser vs GentleTap invoice reminders",
    ],
    category: "Enterprise accounts receivable",
    competitorUrl: "https://www.chaserhq.com/integrations/quickbooks-online",
    competitorSummary:
      "Chaser is a mature accounts receivable platform used by SMBs and finance teams. It integrates deeply with QuickBooks Online and Xero, offering multi-channel chasing (email, SMS, automated phone calls, postal letters), a customer payment portal, predictive late-payment scoring, cash-flow forecasting, and team collaboration on debtor communications.",
    gentletapSummary:
      "GentleTap targets solo freelancers and small consultancies who invoice in QuickBooks and want polite, AI-drafted email follow-ups from their own Gmail — with optional WhatsApp on higher plans — without enterprise AR overhead.",
    whenTheyWin:
      "Choose Chaser if you have a finance team, need SMS/phone/postal escalation, want a branded payment portal with multiple payment methods, or manage high invoice volume across entities. Chaser is built for serious credit control at scale.",
    whenGentletapWins:
      "Choose GentleTap if you're a freelancer chasing 5–30 overdue invoices who wants relationship-preserving follow-ups from your personal Gmail in under five minutes — at a fraction of Chaser's price.",
    honestVerdict:
      "Chaser is the more powerful product for collections teams. GentleTap is the more accessible product for independents who would never pay £199+/month for AR software. Chaser sends from your email address too, but its positioning, pricing, and feature depth target businesses with dedicated AR workflows — not solo designers sending polite nudges.",
    pricingNote:
      "Chaser: from ~£199/mo (~$259 USD) for businesses under ~$5M revenue (4 users, limited workflows); scales to £599–899+/mo for larger tiers. GentleTap: free Starter, Pro $19/mo, Pro+ $39/mo.",
    comparisonRows: [
      { feature: "Target user", competitor: "Finance teams & SMBs", gentletap: "Solo freelancers & consultants" },
      { feature: "Starting price", competitor: "~$259/mo (published tiers)", gentletap: "Free · Pro from $19/mo" },
      { feature: "Email from your address", competitor: "Yes", gentletap: "Yes — Gmail" },
      { feature: "SMS / phone / letters", competitor: "Yes — multi-channel", gentletap: "WhatsApp only (Pro+)" },
      { feature: "Payment portal", competitor: "Yes — Chaser Pay", gentletap: "Uses QBO payment links" },
      { feature: "AI message drafts", competitor: "Template personalization", gentletap: "AI per invoice + client profile" },
      { feature: "Setup time", competitor: "Days (workflows, templates)", gentletap: "Under 5 minutes" },
    ],
    faq: [
      {
        q: "Is GentleTap a Chaser alternative?",
        a: "For freelancers on QuickBooks who only need email (and optional WhatsApp) follow-ups, yes. For businesses needing SMS, auto-calls, payment portals, and team AR dashboards, Chaser remains the better fit despite the higher cost.",
      },
      {
        q: "Does Chaser have AI reminders?",
        a: "Chaser offers predictive late-payment scoring and template personalization with merge fields. GentleTap generates unique draft copy per invoice using AI, informed by client payment history.",
      },
    ],
  },

  melio: {
    slug: "melio",
    name: "Melio",
    tagline: "Free payments platform vs QuickBooks follow-up specialist",
    metaTitle: "GentleTap vs Melio — Invoice Reminders & AR Compared",
    metaDescription:
      "Melio offers free invoicing and payment reminders with QuickBooks sync. GentleTap adds AI-personalized Gmail follow-ups on top of QuickBooks. Honest comparison of fit, features, and pricing.",
    keywords: [
      "GentleTap vs Melio",
      "Melio invoice reminders",
      "Melio accounts receivable alternative",
      "Melio QuickBooks payment reminders",
    ],
    category: "B2B payments & invoicing",
    competitorUrl: "https://meliopayments.com/accounts-receivable/",
    competitorSummary:
      "Melio is a B2B payments platform covering both accounts payable and accounts receivable. Its AR side lets you create branded invoices with embedded payment links, track status in real time, and configure automatic payment reminder notifications. Melio syncs with QuickBooks and charges no monthly subscription — revenue comes from payment processing (e.g. card fees ~2.5–2.9%).",
    gentletapSummary:
      "GentleTap does not create invoices or process payments. It syncs existing QuickBooks Online invoices and automates escalating, AI-personalized follow-ups from your Gmail until the QBO balance hits zero.",
    whenTheyWin:
      "Choose Melio if you want to issue invoices, collect card/ACH payments, and send basic reminders — all in one free platform with QuickBooks sync. Melio is strong when payment collection and reconciliation are the priority.",
    whenGentletapWins:
      "Choose GentleTap if you already invoice in QuickBooks (not Melio), want AI-personalized escalating sequences, send from your Gmail (not Melio-branded notifications), and need tone that adapts per client — without switching where invoices are created.",
    honestVerdict:
      "Melio and GentleTap can complement each other in theory, but most freelancers pick one invoicing home. If QuickBooks is your invoice source, Melio's AR module is redundant for creation — and its reminders are simpler than GentleTap's AI sequences. Melio wins on payments infrastructure; GentleTap wins on intelligent follow-up for QBO-native workflows.",
    pricingNote:
      "Melio: no monthly subscription for AR basics; transaction fees on card/expedited transfers. GentleTap: free Starter, Pro $19/mo, Pro+ $39/mo.",
    comparisonRows: [
      { feature: "Creates invoices", competitor: "Yes — in Melio", gentletap: "No — reads from QuickBooks" },
      { feature: "Payment processing", competitor: "Yes — card, ACH, bank", gentletap: "No — links to QBO payment URL" },
      { feature: "Monthly subscription", competitor: "Free (pay per transaction)", gentletap: "Free tier · Pro from $19/mo" },
      { feature: "Reminder sophistication", competitor: "Configurable notifications", gentletap: "AI sequences, warm → firm" },
      { feature: "Send from Gmail", competitor: "Melio-branded invoice emails", gentletap: "Your Gmail inbox" },
      { feature: "QuickBooks sync", competitor: "Two-way", gentletap: "Read-only QBO sync" },
      { feature: "WhatsApp", competitor: "No", gentletap: "Yes — Pro+" },
    ],
    faq: [
      {
        q: "Is Melio free compared to GentleTap?",
        a: "Melio has no monthly fee but charges payment processing fees. GentleTap has a genuinely free Starter tier for 5 collections/month. 'Free' depends on whether you need payment processing or just follow-up.",
      },
      {
        q: "Can I use Melio and GentleTap together?",
        a: "Only cleanly if QuickBooks remains the source of truth for open balances. If you invoice through Melio and sync to QBO, GentleTap can chase those QBO records. Running two reminder systems on the same invoices would duplicate emails — pick one.",
      },
    ],
  },

  "invoice-dunning": {
    slug: "invoice-dunning",
    name: "Invoice dunning software",
    tagline: "Traditional dunning vs relationship-first follow-up",
    metaTitle: "GentleTap vs Invoice Dunning Software — Honest Comparison",
    metaDescription:
      "What is invoice dunning? Compare traditional dunning automation (fees, escalations, portals) with GentleTap's freelancer-friendly QuickBooks follow-up from Gmail.",
    keywords: [
      "invoice dunning software",
      "dunning automation QuickBooks",
      "GentleTap vs dunning",
      "payment dunning vs payment reminders",
      "accounts receivable dunning",
    ],
    category: "AR dunning & collections",
    competitorSummary:
      "Invoice dunning software automates escalating collection communications — typically email, SMS, and portal notices — often with late fees, interest charges, statements, and payment-plan workflows. Tools like Paidnice, Chaser, and enterprise AR platforms implement formal dunning cadences designed for businesses enforcing credit policies.",
    gentletapSummary:
      "GentleTap implements a gentler version of dunning: multi-step escalation from warm to firm, but explicitly avoids collections language ('demand notice', 'legal action', etc.) and sends from your personal Gmail so clients hear from you — not a collections department.",
    whenTheyWin:
      "Choose traditional dunning software if you need automatic late fees, statutory interest, formal statements, credit holds, or compliance-heavy collection workflows — especially for B2B with strict AR policies.",
    whenGentletapWins:
      "Choose GentleTap if you're a freelancer or consultant whose client relationships are the product — you need consistent follow-up without sounding like a collections agency, and you invoice through QuickBooks Online.",
    honestVerdict:
      "GentleTap is not full dunning software. It does not auto-apply late fees, send statutory demand letters, or run credit-control dashboards. That's intentional. If you need hard collections infrastructure, use Paidnice or Chaser. If you need polite persistence that preserves repeat work, GentleTap fits better than any dunning platform.",
    pricingNote:
      "Dunning platforms: typically $69–259+/mo (Paidnice from $69, Chaser from ~$259). GentleTap: free Starter, Pro $19/mo.",
    comparisonRows: [
      { feature: "Late fees & interest", competitor: "Yes — core feature (Paidnice, etc.)", gentletap: "No — relationship-first" },
      { feature: "Tone", competitor: "Formal → legal escalation paths", gentletap: "Warm → firm, no collections language" },
      { feature: "Sender identity", competitor: "Company / AR department", gentletap: "Your Gmail, your name" },
      { feature: "QuickBooks focus", competitor: "Varies by vendor", gentletap: "Built for QBO freelancers" },
      { feature: "Payment portal", competitor: "Usually included", gentletap: "QBO payment links" },
      { feature: "Best for", competitor: "Credit control & compliance", gentletap: "Freelancer client relationships" },
    ],
    faq: [
      {
        q: "What is invoice dunning?",
        a: "Dunning is the process of systematically reminding customers about overdue payments, escalating communication until paid. Software automates those steps — often with fees, statements, and formal notices.",
      },
      {
        q: "Is GentleTap dunning software?",
        a: "Partially — it runs automated escalation sequences, but without late fees, legal templates, or collections positioning. We call it payment follow-up, not dunning, because the tone and sender identity are designed for freelancers, not AR departments.",
      },
    ],
  },

  invoicechaser: {
    slug: "invoicechaser",
    name: "InvoiceChaser",
    tagline: "Trade-focused SMS chaser vs freelancer Gmail follow-up",
    metaTitle: "GentleTap vs InvoiceChaser — QuickBooks Reminders Compared",
    metaDescription:
      "Honest comparison of InvoiceChaser (SMS + email AR automation) vs GentleTap (AI Gmail follow-up for freelancers). Pricing, channels, and fit explained.",
    keywords: [
      "GentleTap vs InvoiceChaser",
      "InvoiceChaser QuickBooks",
      "InvoiceChaser alternative",
      "SMS invoice reminder software",
    ],
    category: "SMS + email AR automation",
    competitorSummary:
      "InvoiceChaser is an automated AR product that connects to QuickBooks, identifies overdue invoices, and sends scheduled SMS and email payment reminders with escalating tone and mobile payment links. Public listings position it toward trade and service businesses with a published price around $99/month plus a one-time setup fee — verify current pricing on their site before buying.",
    gentletapSummary:
      "GentleTap focuses on AI-personalized email from your Gmail (plus optional WhatsApp on Pro+), built for freelancers who want follow-ups that read like they wrote them — not automated SMS blasts.",
    whenTheyWin:
      "Choose InvoiceChaser if SMS is your primary collection channel, you serve trade/service clients who respond to texts, and you want a turnkey QBO-connected chaser with payment links — and the published pricing works for your volume.",
    whenGentletapWins:
      "Choose GentleTap if email from your real Gmail matters more than SMS, you want AI drafts tuned per client history, you prefer WhatsApp over SMS for international clients, or you're a freelancer who can't justify ~$99/mo plus setup fees.",
    honestVerdict:
      "InvoiceChaser and GentleTap both automate QuickBooks follow-ups but through different channels and audiences. InvoiceChaser leans SMS-first for field-service and trade businesses. GentleTap leans Gmail-first for knowledge-work freelancers. We have less public documentation on InvoiceChaser than on Chaser or Paidnice — treat their feature list and pricing as something to confirm directly.",
    pricingNote:
      "InvoiceChaser: ~$99/mo + ~$1,500 setup (per third-party listings — confirm with vendor). GentleTap: free Starter, Pro $19/mo, Pro+ $39/mo with WhatsApp.",
    comparisonRows: [
      { feature: "Primary channel", competitor: "SMS + email", gentletap: "Email (Gmail) + WhatsApp (Pro+)" },
      { feature: "AI personalization", competitor: "Escalating templates", gentletap: "AI per invoice + history" },
      { feature: "Send from your Gmail", competitor: "No — platform sends", gentletap: "Yes" },
      { feature: "Target audience", competitor: "Trade / service businesses", gentletap: "Freelancers & consultants" },
      { feature: "Setup fee", competitor: "One-time fee reported", gentletap: "None — self-serve" },
      { feature: "QuickBooks sync", competitor: "Yes", gentletap: "Yes — read-only" },
    ],
    faq: [
      {
        q: "Is InvoiceChaser the same as Chaser?",
        a: "No. Chaser (chaserhq.com) is a large AR platform. InvoiceChaser is a separate product focused on SMS/email automation — verify you're evaluating the right vendor.",
      },
      {
        q: "Does GentleTap send SMS?",
        a: "No. GentleTap sends email from Gmail and optional WhatsApp follow-ups on Pro+ and Team plans — not SMS.",
      },
    ],
  },

  landolio: {
    slug: "landolio",
    name: "Landolio",
    tagline: "UK freelancer reminder tool vs QuickBooks AI follow-up",
    metaTitle: "GentleTap vs Landolio — Invoice Follow-Up Compared (UK)",
    metaDescription:
      "Landolio automates 3-email invoice reminders for UK freelancers from £9/mo. GentleTap syncs QuickBooks with AI Gmail follow-ups. Honest comparison for UK sole traders.",
    keywords: [
      "GentleTap vs Landolio",
      "Landolio invoice reminders",
      "UK freelancer invoice follow up",
      "Landolio alternative QuickBooks",
    ],
    category: "UK freelancer follow-up tool",
    competitorUrl: "https://app.landolio.com/",
    competitorSummary:
      "Landolio offers an Invoice Follow-Up Automator for UK freelancers: add invoice details manually, and it sends a three-email sequence (3 days before due, on due date, 7 days after). Free tier covers 3 active invoices; Pro is £9/month for unlimited invoices, custom templates, and open tracking. Landolio also sells template packs and free UK freelancer tools (invoice generator, late payment letter generator).",
    gentletapSummary:
      "GentleTap syncs QuickBooks Online automatically, drafts AI-personalized reminders per client, runs a five-step warm-to-firm sequence, sends from your Gmail, and stops when QBO shows paid — with optional WhatsApp on Pro+.",
    whenTheyWin:
      "Choose Landolio if you're a UK sole trader without QuickBooks who manually tracks a few invoices and wants a cheap (£9/mo), simple three-email sequence — especially if you value UK-specific guides and late-payment letter templates.",
    whenGentletapWins:
      "Choose GentleTap if you invoice through QuickBooks Online, want automatic sync (no manual entry), AI personalization, Gmail sending, longer escalation sequences, and optional WhatsApp — and you serve clients globally, not just UK.",
    honestVerdict:
      "Landolio is an excellent low-cost option for UK freelancers with simple needs and no QBO workflow. GentleTap is better when QuickBooks is already central to your billing. Landolio requires manual invoice entry; GentleTap eliminates that. Landolio is cheaper at £9/mo for unlimited manual invoices; GentleTap's free tier covers 5 QBO collections/month.",
    pricingNote:
      "Landolio: free (3 invoices), Pro £9/mo. GentleTap: free Starter (5 collections/mo), Pro $19/mo (~£15).",
    comparisonRows: [
      { feature: "QuickBooks sync", competitor: "No — manual entry", gentletap: "Yes — automatic" },
      { feature: "UK-specific content", competitor: "Yes — guides, letters, MTD", gentletap: "Global; QBO currency support" },
      { feature: "Reminder sequence", competitor: "3 emails (fixed timing)", gentletap: "5 steps, warm → firm" },
      { feature: "AI personalization", competitor: "Template-based", gentletap: "AI per client history" },
      { feature: "Send from Gmail", competitor: "Platform sends", gentletap: "Your Gmail" },
      { feature: "Starting price", competitor: "Free · £9/mo Pro", gentletap: "Free · $19/mo Pro" },
    ],
    faq: [
      {
        q: "Is Landolio better for UK freelancers?",
        a: "For UK legal content (late payment letters, MTD guides) and manual invoice tracking without QuickBooks, yes. For QuickBooks users who want automated sync and AI follow-up, GentleTap is the better fit.",
      },
      {
        q: "Does GentleTap support UK late payment law?",
        a: "GentleTap automates polite follow-up emails; it does not generate statutory demand letters or calculate statutory interest. Landolio's template packs cover UK legal correspondence — a different use case.",
      },
    ],
  },

  paidnice: {
    slug: "paidnice",
    name: "Paidnice",
    tagline: "Full AR automation vs focused freelancer follow-up",
    metaTitle: "GentleTap vs Paidnice — QuickBooks AR Compared (2026)",
    metaDescription:
      "Paidnice automates late fees, reminders, and statements for QuickBooks and Xero from $69/mo. GentleTap offers AI Gmail follow-up from $19/mo. Honest comparison.",
    keywords: [
      "GentleTap vs Paidnice",
      "Paidnice alternative",
      "Paidnice QuickBooks reminders",
      "Paidnice pricing vs GentleTap",
    ],
    category: "AR automation (QBO + Xero)",
    competitorUrl: "https://www.paidnice.com/",
    competitorSummary:
      "Paidnice is a full accounts receivable automation layer for QuickBooks Online and Xero. It handles multi-step reminders, automatic late fees and interest (including compound and variable rates), customer statements, payment plans, escalations, a customer payment portal, and credit-risk tools. Flat-rate pricing from $69/month with unlimited users — no revenue caps.",
    gentletapSummary:
      "GentleTap focuses on AI-personalized payment follow-up emails from your Gmail for QuickBooks freelancers — without late fees, statements, or payment portals. Optional WhatsApp on Pro+.",
    whenTheyWin:
      "Choose Paidnice if you need automatic late fees, formal statements, payment plans, a customer portal, or Xero support alongside QuickBooks. Paidnice is the stronger product for complete AR policy enforcement.",
    whenGentletapWins:
      "Choose GentleTap if you only need intelligent email follow-up (plus optional WhatsApp), want the lowest cost, send from your personal Gmail rather than a portal-centric workflow, and don't want to configure fee rules or statements.",
    honestVerdict:
      "Paidnice is more complete AR software; GentleTap is a narrower, cheaper tool for freelancers who find Paidnice's feature set (and $69/mo entry price) more than they need. Paidnice wins on late fees and Xero. GentleTap wins on AI tone, Gmail-native sending, and freelancer pricing.",
    pricingNote:
      "Paidnice: from $69/mo (Essentials), Pro $99/mo — unlimited users. GentleTap: free Starter, Pro $19/mo, Pro+ $39/mo.",
    comparisonRows: [
      { feature: "Late fees & interest", competitor: "Yes — configurable rules", gentletap: "No" },
      { feature: "Xero support", competitor: "Yes", gentletap: "No — QuickBooks Online only" },
      { feature: "Payment portal", competitor: "Yes", gentletap: "QBO payment links only" },
      { feature: "AI message drafts", competitor: "Template sequences", gentletap: "AI per invoice + profile" },
      { feature: "Send from Gmail", competitor: "Custom domain email", gentletap: "Your Gmail inbox" },
      { feature: "Starting price", competitor: "$69/mo", gentletap: "Free · Pro $19/mo" },
      { feature: "WhatsApp", competitor: "No", gentletap: "Yes — Pro+" },
    ],
    faq: [
      {
        q: "Is Paidnice worth 3× the price of GentleTap Pro?",
        a: "If you need late fees, statements, and a payment portal — yes. If you only need polite escalating email from Gmail, GentleTap Pro at $19/mo covers that without Paidnice's AR overhead.",
      },
      {
        q: "Can Paidnice send from Gmail?",
        a: "Paidnice sends from your configured domain/sender — similar goal, different setup. GentleTap specifically uses Gmail OAuth so replies land in your existing inbox threads.",
      },
    ],
  },

  honeybook: {
    slug: "honeybook",
    name: "HoneyBook",
    tagline: "Creative client CRM vs QuickBooks payment follow-up",
    metaTitle: "GentleTap vs HoneyBook — Payment Reminders Compared",
    metaDescription:
      "HoneyBook bundles CRM, contracts, and payment reminders for creatives. GentleTap automates QuickBooks follow-ups from Gmail. Honest comparison of fit and pricing.",
    keywords: [
      "GentleTap vs HoneyBook",
      "HoneyBook payment reminders alternative",
      "HoneyBook vs QuickBooks reminders",
      "HoneyBook invoice follow up",
    ],
    category: "Creative client management CRM",
    competitorUrl: "https://www.honeybook.com/product/payment-reminders",
    competitorSummary:
      "HoneyBook is an all-in-one client management platform for creatives and service businesses — proposals, contracts, invoicing, scheduling, and automated payment reminders in one place. Default reminders go out 7 days before, on, and 2 days after due dates (customizable). HoneyBook syncs payments to QuickBooks but invoicing lives in HoneyBook first.",
    gentletapSummary:
      "GentleTap chases overdue QuickBooks Online invoices with AI-personalized sequences from your Gmail. It is not a CRM, scheduler, or contract tool.",
    whenTheyWin:
      "Choose HoneyBook if your entire client journey — inquiry to payment — runs through HoneyBook and you want reminders bundled with proposals, contracts, and a polished client portal. HoneyBook is the system of record for your client work.",
    whenGentletapWins:
      "Choose GentleTap if you invoice in QuickBooks (not HoneyBook), need longer escalation sequences than HoneyBook's default three reminders, want AI-personalized copy, or send from Gmail rather than HoneyBook-branded emails.",
    honestVerdict:
      "Same pattern as Bonsai: HoneyBook is a platform; GentleTap is a follow-up layer. HoneyBook reminders are fine for invoices created inside HoneyBook. They won't chase QuickBooks invoices you created directly in QBO unless those sync back as open balances GentleTap can read.",
    pricingNote:
      "HoneyBook: from ~$39/mo (annual billing discounts available). GentleTap: free Starter, Pro $19/mo.",
    comparisonRows: [
      { feature: "CRM & contracts", competitor: "Yes — core product", gentletap: "No" },
      { feature: "Invoice source", competitor: "HoneyBook → syncs to QBO", gentletap: "QuickBooks Online" },
      { feature: "Reminder count", competitor: "3 default (customizable)", gentletap: "5-step escalation" },
      { feature: "AI personalization", competitor: "Editable templates", gentletap: "AI per client history" },
      { feature: "Send from Gmail", competitor: "HoneyBook-branded", gentletap: "Your Gmail" },
      { feature: "WhatsApp", competitor: "No", gentletap: "Yes — Pro+" },
    ],
    faq: [
      {
        q: "I use HoneyBook and QuickBooks — which sends reminders?",
        a: "HoneyBook reminders apply to HoneyBook invoices. GentleTap reads open QuickBooks balances. If HoneyBook syncs paid status to QBO promptly, use one system to avoid duplicate chasers.",
      },
    ],
  },

  duedrop: {
    slug: "duedrop",
    name: "DueDrop",
    tagline: "Gmail-native AR vs QuickBooks-focused follow-up",
    metaTitle: "GentleTap vs DueDrop — Invoice Reminder Software Compared",
    metaDescription:
      "DueDrop and GentleTap both send invoice reminders from your real email. Compare QuickBooks integration, AI personalization, WhatsApp, and pricing honestly.",
    keywords: [
      "GentleTap vs DueDrop",
      "DueDrop alternative",
      "DueDrop invoice reminders",
      "Gmail invoice follow up software",
    ],
    category: "Gmail-native invoice reminders",
    competitorUrl: "https://duedropin.com/",
    competitorSummary:
      "DueDrop automates friendly invoice reminders sent from your Gmail, Outlook, Yahoo, or Zoho Mail. It syncs with QuickBooks, Xero, FreshBooks, and Wave, matches tone from prior email threads, supports per-client cadence rules, and pauses when clients reply. Positioned for service businesses and agencies.",
    gentletapSummary:
      "GentleTap also sends from Gmail with QuickBooks Online sync, AI-personalized drafts, multi-step escalation, preview-before-send, and optional WhatsApp follow-ups on Pro+.",
    whenTheyWin:
      "Choose DueDrop if you use Xero, FreshBooks, or Wave (not just QuickBooks), need Outlook/Yahoo/Zoho senders, or want tone-matching from your prior email threads across multiple accounting platforms.",
    whenGentletapWins:
      "Choose GentleTap if QuickBooks Online is your only accounting system, you want onboarding preview/approve before go-live, client profiling from QBO payment history, WhatsApp follow-ups, or a free tier to start (5 collections/month).",
    honestVerdict:
      "DueDrop and GentleTap are the closest competitors on this list — both send from your real inbox with accounting sync. DueDrop supports more accounting platforms and mail providers. GentleTap goes deeper on QuickBooks-specific client profiling, has a free tier, and adds WhatsApp. Compare pricing directly on each site — DueDrop's public pricing may differ by plan.",
    pricingNote:
      "DueDrop: check duedropin.com for current plans. GentleTap: free Starter, Pro $19/mo, Pro+ $39/mo.",
    comparisonRows: [
      { feature: "Accounting sync", competitor: "QBO, Xero, FreshBooks, Wave", gentletap: "QuickBooks Online (+ CSV)" },
      { feature: "Email providers", competitor: "Gmail, Outlook, Yahoo, Zoho", gentletap: "Gmail + Resend domain" },
      { feature: "Tone matching", competitor: "From prior email threads", gentletap: "AI + client payment history" },
      { feature: "WhatsApp", competitor: "No", gentletap: "Yes — Pro+" },
      { feature: "Free tier", competitor: "Check vendor site", gentletap: "Yes — 5 collections/mo" },
      { feature: "Preview before send", competitor: "Varies", gentletap: "Yes — onboarding approval" },
    ],
    faq: [
      {
        q: "Are DueDrop and GentleTap the same?",
        a: "Similar category (inbox-native invoice reminders) but different depth: DueDrop spans multiple accounting apps; GentleTap specializes in QuickBooks freelancers with AI profiling and WhatsApp.",
      },
    ],
  },

  nudgepe: {
    slug: "nudgepe",
    name: "NudgePe",
    tagline: "Spreadsheet & Stripe follow-up vs QuickBooks AI reminders",
    metaTitle: "GentleTap vs NudgePe — Invoice Follow-Up Compared",
    metaDescription:
      "NudgePe automates invoice follow-ups from Gmail with CSV/Stripe/Sheets. GentleTap syncs QuickBooks with AI reminders. Honest feature and fit comparison.",
    keywords: [
      "GentleTap vs NudgePe",
      "NudgePe alternative",
      "NudgePe invoice reminders",
      "Gmail overdue invoice automation",
    ],
    category: "Gmail invoice follow-up",
    competitorUrl: "https://nudgepe.com/",
    competitorSummary:
      "NudgePe sends automated invoice follow-up sequences from your Gmail or Outlook. It supports CSV import, Google Sheets sync, and Stripe read-only integration — when Stripe shows paid, reminders stop. Includes a free reminder text generator; paid plans add automated sending.",
    gentletapSummary:
      "GentleTap syncs QuickBooks Online directly (no CSV maintenance), drafts AI-personalized reminders from client payment history, and offers WhatsApp follow-ups on Pro+.",
    whenTheyWin:
      "Choose NudgePe if you invoice through Stripe or track receivables in spreadsheets rather than QuickBooks, or if you want a lightweight Gmail automation without connecting accounting software.",
    whenGentletapWins:
      "Choose GentleTap if QuickBooks Online is your invoice system of record, you want automatic balance sync and stop-on-payment without CSV exports, or you need client profiling from historical QBO payments.",
    honestVerdict:
      "NudgePe and GentleTap serve different billing workflows. NudgePe fits Stripe/spreadsheet-first freelancers. GentleTap fits QuickBooks-first freelancers. Neither is universally better — it depends where your invoices live.",
    pricingNote:
      "NudgePe: free generator; paid plans on nudgepe.com (14-day trial mentioned). GentleTap: free Starter, Pro $19/mo.",
    comparisonRows: [
      { feature: "Data source", competitor: "CSV, Google Sheets, Stripe", gentletap: "QuickBooks Online (+ CSV)" },
      { feature: "QuickBooks sync", competitor: "No native QBO", gentletap: "Yes — read-only" },
      { feature: "Email sending", competitor: "Gmail, Outlook", gentletap: "Gmail, Resend" },
      { feature: "AI personalization", competitor: "Template sequences", gentletap: "AI + QBO client history" },
      { feature: "WhatsApp", competitor: "No", gentletap: "Yes — Pro+" },
      { feature: "Free tools", competitor: "Free reminder generator", gentletap: "Free Starter plan (5/mo)" },
    ],
    faq: [
      {
        q: "I use Stripe Invoicing — which tool fits?",
        a: "NudgePe's Stripe integration is the natural fit. GentleTap is built for QuickBooks Online balances, not Stripe-native invoicing.",
      },
    ],
  },

  freshbooks: {
    slug: "freshbooks",
    name: "FreshBooks",
    tagline: "Built-in FreshBooks reminders vs AI follow-up on top of FreshBooks",
    metaTitle: "GentleTap vs FreshBooks — Invoice Reminders Compared",
    metaDescription:
      "FreshBooks includes automated payment reminders with its invoicing plans. GentleTap connects to FreshBooks (and QuickBooks) for AI Gmail follow-up that stops when balances clear. Honest comparison for freelancers.",
    keywords: [
      "GentleTap vs FreshBooks",
      "FreshBooks payment reminders alternative",
      "FreshBooks invoice follow up",
      "QuickBooks vs FreshBooks reminders",
    ],
    category: "Freelancer accounting & invoicing",
    competitorUrl: "https://www.freshbooks.com/",
    competitorSummary:
      "FreshBooks is freelancer-friendly accounting and invoicing software with time tracking, expense management, and automated payment reminders on overdue invoices. Reminders are built into FreshBooks' own invoicing — template-based, sent from FreshBooks.",
    gentletapSummary:
      "GentleTap does not replace FreshBooks. It connects read-only to FreshBooks (or QuickBooks Online) and adds AI-personalized, escalating follow-ups sent from your Gmail, with automatic stop when outstanding balance hits zero.",
    whenTheyWin:
      "Choose FreshBooks alone if you want one platform for invoicing, expenses, time tracking, and basic template reminders — and don't need Gmail-native AI sequences.",
    whenGentletapWins:
      "Choose GentleTap with FreshBooks if you keep invoicing in FreshBooks but want smarter follow-up — AI drafts, Gmail sending, five-step sequences, WhatsApp on Pro+, and payment detection from FreshBooks balances.",
    honestVerdict:
      "FreshBooks is the accounting/invoicing system of record; GentleTap is the follow-up layer. Use FreshBooks reminders for simple nudges, or connect GentleTap when you want relationship-aware sequences that stop on payment.",
    pricingNote:
      "FreshBooks: from ~$21/mo (Lite) with invoicing and reminders included. GentleTap: free Starter, Pro $19/mo (requires a FreshBooks or QBO account for sync).",
    comparisonRows: [
      { feature: "Accounting & invoicing", competitor: "Yes — full platform", gentletap: "No — follow-up only" },
      { feature: "Native FreshBooks sync", competitor: "N/A — is FreshBooks", gentletap: "Yes — read-only OAuth" },
      { feature: "Reminder sophistication", competitor: "Built-in templates", gentletap: "AI sequences from Gmail" },
      { feature: "Send from Gmail", competitor: "FreshBooks-branded", gentletap: "Your Gmail" },
      { feature: "WhatsApp", competitor: "No", gentletap: "Yes — Pro+" },
    ],
    faq: [
      {
        q: "Does GentleTap work with FreshBooks?",
        a: "Yes. Connect FreshBooks via OAuth in onboarding or Settings → Connections. GentleTap imports outstanding invoices, sends reminders from your Gmail, and stops when FreshBooks shows the balance paid.",
      },
    ],
  },

  invoicesherpa: {
    slug: "invoicesherpa",
    name: "InvoiceSherpa",
    tagline: "SMB AR automation vs freelancer-friendly AI follow-up",
    metaTitle: "GentleTap vs InvoiceSherpa — AR Reminders Compared (2026)",
    metaDescription:
      "Honest InvoiceSherpa vs GentleTap comparison. InvoiceSherpa is SMB accounts-receivable automation from ~$49/mo. GentleTap is AI-drafted follow-up from your Gmail for freelancers, free to start. See which fits.",
    keywords: [
      "GentleTap vs InvoiceSherpa",
      "InvoiceSherpa alternative",
      "InvoiceSherpa pricing",
      "invoice chasing software for freelancers",
    ],
    category: "SMB accounts receivable automation",
    competitorUrl: "https://www.invoicesherpa.com/",
    competitorSummary:
      "InvoiceSherpa is an established AR automation tool for small and mid-sized businesses. It syncs with QuickBooks and Xero, sends scheduled reminder sequences, offers a customer payment portal, and targets finance teams that manage steady invoice volume.",
    gentletapSummary:
      "GentleTap is built for solo freelancers and tiny teams: connect QuickBooks or FreshBooks, and AI drafts polite, client-specific follow-ups that send from your own Gmail — with optional WhatsApp on Pro+ — and stop the moment a balance clears.",
    whenTheyWin:
      "Choose InvoiceSherpa if you run a small finance team, want a branded payment portal, and need scheduled reminder cadences across many customers — it's proven SMB AR automation.",
    whenGentletapWins:
      "Choose GentleTap if you're a freelancer who wants follow-ups that read like you wrote them, sent from your real Gmail in about five minutes — starting free, with no portal or team overhead.",
    honestVerdict:
      "InvoiceSherpa is solid SMB AR automation; GentleTap is the lighter, cheaper, AI-personalized option for freelancers who live in QuickBooks or FreshBooks and just want clients to pay without awkward chases.",
    pricingNote:
      "InvoiceSherpa: from ~$49/mo. GentleTap: free Starter (5 collections/mo), Pro $19/mo, Pro+ $39/mo with WhatsApp.",
    comparisonRows: [
      { feature: "Primary audience", competitor: "SMB finance teams", gentletap: "Freelancers & small consultancies" },
      { feature: "Reminder personalization", competitor: "Template sequences", gentletap: "AI drafts per invoice + client history" },
      { feature: "Send from your Gmail", competitor: "No — InvoiceSherpa servers", gentletap: "Yes — your Gmail address" },
      { feature: "Payment portal", competitor: "Yes", gentletap: "No — uses your invoice payment links" },
      { feature: "WhatsApp follow-ups", competitor: "No", gentletap: "Yes — Pro+ and Team" },
      { feature: "FreshBooks support", competitor: "No", gentletap: "Yes — plus QuickBooks Online" },
      { feature: "Free tier", competitor: "Trial only", gentletap: "Free Starter — 5 collections/mo" },
    ],
    faq: [
      {
        q: "Is InvoiceSherpa worth it for a solo freelancer?",
        a: "Usually not — at ~$49/mo it's priced for businesses with steady AR volume. GentleTap's free Starter covers 5 collections a month, and Pro is $19/mo for unlimited follow-up.",
      },
      {
        q: "Which is easier to set up?",
        a: "GentleTap: connect QuickBooks or FreshBooks and Gmail, preview your first AI drafts, and go live in about five minutes. InvoiceSherpa setup is also guided, but oriented to team workflows.",
      },
      {
        q: "Can GentleTap replace InvoiceSherpa?",
        a: "For freelancer-scale invoice chasing, yes — you keep sequences, payment detection, and escalation, and gain AI personalization and Gmail sending. If you rely on InvoiceSherpa's payment portal, that's the one piece GentleTap doesn't replicate.",
      },
    ],
  },

  upflow: {
    slug: "upflow",
    name: "Upflow",
    tagline: "Mid-market AR platform vs solo-friendly follow-up",
    metaTitle: "GentleTap vs Upflow — AR Automation Compared (2026)",
    metaDescription:
      "Honest Upflow vs GentleTap comparison. Upflow is a mid-market AR platform ($275+/mo) for finance teams. GentleTap is AI invoice follow-up from Gmail for freelancers and small businesses, free to start.",
    keywords: [
      "GentleTap vs Upflow",
      "Upflow alternative for small business",
      "Upflow pricing",
      "accounts receivable software for freelancers",
    ],
    category: "Mid-market accounts receivable platform",
    competitorUrl: "https://www.upflow.io/",
    competitorSummary:
      "Upflow is a full AR management platform for mid-market finance teams: collections workflows, customer portals, payment promises tracking, cash forecasting, analytics dashboards, and deep ERP/accounting integrations.",
    gentletapSummary:
      "GentleTap deliberately does far less: it chases your overdue QuickBooks and FreshBooks invoices with AI-personalized emails from your Gmail (plus WhatsApp on Pro+), and stops when clients pay. No portal, no forecasting — just follow-up that works.",
    whenTheyWin:
      "Choose Upflow if you have a dedicated AR/finance team, complex collections workflows, multiple entities, or need cash-flow analytics and payment-promise tracking. It's a serious mid-market platform.",
    whenGentletapWins:
      "Choose GentleTap if you're a freelancer or small business that finds Upflow's price and scope absurd for chasing a handful of invoices — you want polite, effective follow-up, not an AR department.",
    honestVerdict:
      "Upflow and GentleTap barely overlap. Upflow manages AR operations for finance teams; GentleTap gives one person superpowers for invoice follow-up at roughly one-tenth the entry price.",
    pricingNote:
      "Upflow: from ~$275/mo (annual contracts typical). GentleTap: free Starter, Pro $19/mo, Pro+ $39/mo, Team $59/mo.",
    comparisonRows: [
      { feature: "Primary audience", competitor: "Mid-market finance teams", gentletap: "Freelancers & small businesses" },
      { feature: "Scope", competitor: "Full AR operations platform", gentletap: "Invoice follow-up specialist" },
      { feature: "Reminder personalization", competitor: "Workflow templates", gentletap: "AI drafts per invoice + client history" },
      { feature: "Cash forecasting", competitor: "Yes", gentletap: "No" },
      { feature: "WhatsApp follow-ups", competitor: "No", gentletap: "Yes — Pro+ and Team" },
      { feature: "Setup time", competitor: "Weeks, with onboarding", gentletap: "About five minutes" },
      { feature: "Entry price", competitor: "~$275/mo", gentletap: "Free (5 collections/mo)" },
    ],
    faq: [
      {
        q: "Is Upflow overkill for a small business?",
        a: "If you don't have a finance team, almost certainly. Upflow's value is in coordinating collections at scale. For chasing your own overdue invoices, GentleTap does the job for free or $19/mo.",
      },
      {
        q: "Does GentleTap integrate with ERPs like Upflow?",
        a: "No — GentleTap connects to QuickBooks Online and FreshBooks only. If you run NetSuite or SAP, Upflow is the appropriate class of tool.",
      },
      {
        q: "Can I start on GentleTap and move to Upflow later?",
        a: "Yes — GentleTap is month-to-month with no lock-in. Businesses that grow into a finance team sometimes graduate to platforms like Upflow; freelancers rarely need to.",
      },
    ],
  },

  satago: {
    slug: "satago",
    name: "Satago",
    tagline: "UK credit-control suite vs simple AI follow-up",
    metaTitle: "GentleTap vs Satago — Invoice Chasing Compared (2026)",
    metaDescription:
      "Honest Satago vs GentleTap comparison. Satago combines credit checking, risk insight, and invoice chasing from ~£83/mo. GentleTap is AI follow-up from Gmail for freelancers on QuickBooks or FreshBooks.",
    keywords: [
      "GentleTap vs Satago",
      "Satago alternative",
      "Satago pricing",
      "credit control software for freelancers",
    ],
    category: "Credit control & risk management",
    competitorUrl: "https://www.satago.com/",
    competitorSummary:
      "Satago is a UK-focused credit-control platform combining business credit checks, risk monitoring, automated invoice chasing, and optional invoice finance. It's aimed at B2B companies that want to vet customers and systematize collections.",
    gentletapSummary:
      "GentleTap skips credit checks and finance products: it connects to QuickBooks or FreshBooks and sends AI-personalized, relationship-preserving follow-ups from your Gmail, stopping when balances clear.",
    whenTheyWin:
      "Choose Satago if you need customer credit vetting, risk dashboards, and structured credit control for a UK B2B ledger — or if you want invoice finance options alongside chasing.",
    whenGentletapWins:
      "Choose GentleTap if your clients are known entities and the problem is simply getting invoices paid on time — you want friendly, effective follow-up from your own inbox at a fraction of the cost.",
    honestVerdict:
      "Satago is credit-risk infrastructure; GentleTap is follow-up automation. Freelancers and small consultancies almost never need Satago's credit-check stack — they need their invoices chased politely and persistently.",
    pricingNote:
      "Satago: from ~£83/mo. GentleTap: free Starter (5 collections/mo), Pro $19/mo, Pro+ $39/mo with WhatsApp.",
    comparisonRows: [
      { feature: "Core focus", competitor: "Credit risk + collections", gentletap: "Invoice follow-up only" },
      { feature: "Credit checks", competitor: "Yes — built in", gentletap: "No" },
      { feature: "Reminder personalization", competitor: "Template sequences", gentletap: "AI drafts per invoice + client history" },
      { feature: "Send from your Gmail", competitor: "No", gentletap: "Yes — your Gmail address" },
      { feature: "Invoice finance", competitor: "Optional add-on", gentletap: "No" },
      { feature: "FreshBooks support", competitor: "No", gentletap: "Yes — plus QuickBooks Online" },
      { feature: "Entry price", competitor: "~£83/mo", gentletap: "Free (5 collections/mo)" },
    ],
    faq: [
      {
        q: "Does GentleTap offer credit checking like Satago?",
        a: "No — GentleTap assumes you already know your clients and focuses purely on getting invoices paid. If you need to vet new customers' creditworthiness, that's Satago's home turf.",
      },
      {
        q: "Is Satago good for freelancers?",
        a: "It's more than most freelancers need — credit checks and risk dashboards suit B2B companies with many unknown customers. GentleTap's free Starter plan covers typical freelancer chasing.",
      },
      {
        q: "Which works outside the UK?",
        a: "Both are geography-agnostic SaaS, though Satago's credit data is UK/EU-centric. GentleTap works wherever QuickBooks Online and FreshBooks do.",
      },
    ],
  },

  chaseai: {
    slug: "chaseai",
    name: "ChaseAI",
    tagline: "Budget AI chasing vs relationship-aware follow-up",
    metaTitle: "GentleTap vs ChaseAI — AI Invoice Chasing Compared (2026)",
    metaDescription:
      "Honest ChaseAI vs GentleTap comparison. ChaseAI offers cheap AI invoice chasing at ~$9/mo. GentleTap adds Gmail-native sending, client-history personalization, WhatsApp, and FreshBooks support.",
    keywords: [
      "GentleTap vs ChaseAI",
      "ChaseAI alternative",
      "ChaseAI app review",
      "AI invoice chasing software",
    ],
    category: "AI invoice chasing (budget tier)",
    competitorSummary:
      "ChaseAI is a newer entrant offering AI-generated invoice chasing emails at a budget price point. It covers the basics — connect accounting, generate chases, send on a schedule — aimed at cost-sensitive solo users.",
    gentletapSummary:
      "GentleTap plays in the same AI-chasing category with a deeper model: per-invoice drafts shaped by client history and overdue stage, sending from your real Gmail, five-step escalating sequences, WhatsApp follow-ups on Pro+, and both QuickBooks and FreshBooks sync.",
    whenTheyWin:
      "Choose ChaseAI if price is the only criterion and you want the cheapest possible AI chasing with minimal features. At ~$9/mo it undercuts nearly everyone.",
    whenGentletapWins:
      "Choose GentleTap if you want the chasing to actually preserve client relationships — Gmail-native sending, drafts that reference real context, automatic stop on payment, and a free Starter tier that already covers light chasing.",
    honestVerdict:
      "ChaseAI proves the AI-chasing category works at $9/mo. GentleTap is the more complete version: same idea, deeper personalization, more channels, and a free tier that means you may never pay at all.",
    pricingNote:
      "ChaseAI: ~$9/mo. GentleTap: free Starter (5 collections/mo), Pro $19/mo, Pro+ $39/mo with WhatsApp, Team $59/mo.",
    comparisonRows: [
      { feature: "AI-drafted chases", competitor: "Yes — basic generation", gentletap: "Yes — client history + overdue stage aware" },
      { feature: "Send from your Gmail", competitor: "No", gentletap: "Yes — replies land in your inbox" },
      { feature: "Escalation sequences", competitor: "Simple schedules", gentletap: "Five-step polite-to-firm ladder" },
      { feature: "WhatsApp follow-ups", competitor: "No", gentletap: "Yes — Pro+ and Team" },
      { feature: "Accounting sync", competitor: "PDF / manual upload (limited sync)", gentletap: "Live QuickBooks + FreshBooks" },
      { feature: "Stop when paid", competitor: "Yes", gentletap: "Yes — balance syncs automatically" },
      { feature: "Free tier", competitor: "No", gentletap: "Free Starter — 5 collections/mo" },
      { feature: "Full features with WhatsApp", competitor: "Not available", gentletap: "Pro+ $39/mo" },
    ],
    faq: [
      {
        q: "Is ChaseAI cheaper than GentleTap?",
        a: "ChaseAI is ~$9/mo; GentleTap Pro is $19/mo — but GentleTap's free Starter plan (5 collections/month) is cheaper than both for light chasing. Full GentleTap features with WhatsApp are Pro+ at $39/mo.",
      },
      {
        q: "What does GentleTap do that ChaseAI doesn't?",
        a: "Live QuickBooks and FreshBooks sync (no PDF re-upload), send from your actual Gmail, personalize drafts with client history and risk, escalate through a five-step sequence, and follow up on WhatsApp on Pro+ ($39).",
      },
      {
        q: "Which is better for client relationships?",
        a: "GentleTap — chases come from your real inbox with per-client context, so they read like personal follow-ups rather than automated dunning.",
      },
    ],
  },

  wave: {
    slug: "wave",
    name: "Wave",
    tagline: "Free invoicing with basic reminders vs AI follow-up specialist",
    metaTitle: "GentleTap vs Wave Reminders — Invoice Follow-Up Compared",
    metaDescription:
      "Wave offers free invoicing with basic payment reminders. GentleTap is the AI follow-up layer for freelancers who already invoice elsewhere — or want smarter chasing than Wave's same-for-everyone reminders.",
    keywords: [
      "GentleTap vs Wave",
      "Wave payment reminders alternative",
      "Wave invoice reminders",
      "free invoice reminder software",
    ],
    category: "Free invoicing platform",
    competitorUrl: "https://www.waveapps.com/",
    competitorSummary:
      "Wave is a popular free accounting and invoicing platform for freelancers and very small businesses. It includes basic payment reminders — typically the same template for every customer — plus optional paid upgrades for payments and bookkeeping features.",
    gentletapSummary:
      "GentleTap doesn't replace Wave's invoicing. It automates polite, AI-personalized follow-up from your Gmail (and WhatsApp on Pro+ at $39/mo), synced to QuickBooks or FreshBooks — or via CSV if you invoice elsewhere.",
    whenTheyWin:
      "Choose Wave if you need free invoicing and bookkeeping first and basic reminders are enough. Wave wins on price for the accounting layer itself.",
    whenGentletapWins:
      "Choose GentleTap when Wave's same-for-all reminders stop recovering invoices — you need per-client AI drafts, Gmail-native sending, multi-step escalation, and WhatsApp. Pair GentleTap with QuickBooks/FreshBooks, or import Wave exports via CSV.",
    honestVerdict:
      "Wave solves 'create invoices for free.' GentleTap solves 'get paid without awkward chasing.' They're complementary for most freelancers — unless you're ready to move invoicing into QuickBooks or FreshBooks, where GentleTap syncs live.",
    pricingNote:
      "Wave: free invoicing (payments/accounting add-ons extra). GentleTap: free Starter (5 collections/mo), Pro $19/mo, Pro+ $39/mo with WhatsApp, Team $59/mo.",
    comparisonRows: [
      { feature: "Primary purpose", competitor: "Free invoicing + bookkeeping", gentletap: "AI payment follow-up only" },
      { feature: "Reminder personalization", competitor: "Basic / template", gentletap: "AI per client + invoice history" },
      { feature: "Send from your Gmail", competitor: "Wave-branded / Wave mail", gentletap: "Yes — your Gmail" },
      { feature: "WhatsApp", competitor: "No", gentletap: "Yes — Pro+ $39/mo" },
      { feature: "Accounting depth", competitor: "Full Wave books", gentletap: "Syncs QBO / FreshBooks (not Wave-native)" },
      { feature: "Free tier includes AI chasing", competitor: "No AI chasing", gentletap: "Yes — 5 collections/mo" },
    ],
    faq: [
      {
        q: "Can GentleTap sync with Wave?",
        a: "Not natively. Export invoices and import via CSV, or move invoicing to QuickBooks Online or FreshBooks for live sync.",
      },
      {
        q: "Is Wave's free plan enough for reminders?",
        a: "For light volume and undemanding clients, often yes. When lateness becomes chronic, template reminders underperform AI sequences that escalate and stop on payment.",
      },
      {
        q: "Should I switch from Wave to GentleTap?",
        a: "You don't switch — Wave keeps creating invoices; GentleTap (via CSV or after moving to QBO/FreshBooks) handles the chase.",
      },
    ],
  },
};

export function getCompetitorComparison(slug: string): CompetitorComparison | undefined {
  return COMPETITOR_COMPARISONS[slug as CompetitorSlug];
}

export function getAllComparisons(): CompetitorComparison[] {
  return COMPETITOR_SLUGS.map((slug) => COMPETITOR_COMPARISONS[slug]);
}
