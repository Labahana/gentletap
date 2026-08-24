/** Feature landing content — one page per core capability. */

export type Feature = {
  slug: string;
  name: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: readonly string[];
  hero: string;
  benefits: readonly { title: string; body: string }[];
  howItWorks: readonly { name: string; text: string }[];
  faq: readonly { q: string; a: string }[];
};

export const FEATURE_SLUGS = [
  "ai-reminder-drafts",
  "ai-client-profiling",
  "send-from-gmail",
  "multi-channel-reminders",
  "whatsapp-reminders",
  "auto-stop-on-payment",
] as const;

export type FeatureSlug = (typeof FEATURE_SLUGS)[number];

export const FEATURES: Record<FeatureSlug, Feature> = {
  "ai-reminder-drafts": {
    slug: "ai-reminder-drafts",
    name: "AI reminder drafts",
    title: "AI-Drafted Invoice Reminders in Your Voice",
    metaTitle: "AI Invoice Reminder Drafts — Personalized Per Client",
    metaDescription:
      "GentleTap's AI drafts each payment reminder from your client history, invoice details, and how overdue it is — firm when it should be, warm when it can be. Preview before anything sends.",
    keywords: [
      "ai invoice reminders",
      "ai payment reminder emails",
      "personalized invoice follow up",
      "ai dunning emails",
    ],
    hero: "Template reminders read like templates. GentleTap's AI writes each reminder for the specific client, invoice, and day — in a voice that sounds like you.",
    benefits: [
      {
        title: "Written for the situation, not the average",
        body: "A first-time late payer at day 3 gets a different message than a repeat offender at day 21. The AI weighs client history, amount, and days overdue.",
      },
      {
        title: "Facts always included",
        body: "Every draft carries the invoice number, amount, and payment link — the three things that actually get invoices paid.",
      },
      {
        title: "You approve before the first send",
        body: "Preview drafts for your real invoices during setup. Edit anything. Nothing sends until you're happy with how it sounds.",
      },
      {
        title: "Escalation without anger",
        body: "Later steps get firmer in directness, not tone — the register that gets paid without torching relationships.",
      },
    ],
    howItWorks: [
      {
        name: "Connect your invoicing",
        text: "Link QuickBooks or FreshBooks — GentleTap reads invoice and client history to learn context.",
      },
      {
        name: "AI learns your voice",
        text: "Drafts are generated per invoice and step, referencing the client, the work, and how overdue things are.",
      },
      {
        name: "Preview and approve",
        text: "Review drafts for your actual open invoices before autopilot turns on.",
      },
      {
        name: "Sends on schedule",
        text: "Each step goes out at the right day in the cadence — no calendar reminders, no copy-paste.",
      },
    ],
    faq: [
      {
        q: "Do AI-drafted reminders sound robotic?",
        a: "They're drafted from your client history and invoice context, and you preview real drafts before anything sends — most users edit once, then leave autopilot on.",
      },
      {
        q: "Can I edit a draft before it sends?",
        a: "Yes — preview and edit drafts during setup, and pause or adjust any invoice's sequence at any time.",
      },
      {
        q: "What data does the AI use to write reminders?",
        a: "Invoice details (number, amount, due date, days overdue) and client context from your connected QuickBooks or FreshBooks account.",
      },
    ],
  },

  "ai-client-profiling": {
    slug: "ai-client-profiling",
    name: "AI client profiling",
    title: "AI Client Payment Profiles — Smarter Follow-Up Per Client",
    metaTitle: "AI Client Profiling for Invoice Follow-Up | GentleTap",
    metaDescription:
      "GentleTap builds a payment profile for every client — average days to pay, late rate, risk level, and preferred channel — then drafts tone and timing accordingly. Included through Pro+ at $39/mo.",
    keywords: [
      "AI client profiling invoices",
      "payment behavior profile",
      "invoice risk scoring freelancers",
      "personalized invoice follow up",
    ],
    hero: "The same reminder doesn't work for every client. GentleTap learns how each client pays — then writes the follow-up that fits.",
    benefits: [
      {
        title: "Payment history, not guesswork",
        body: "Average days to pay, on-time vs late counts, tenure, and lifetime value feed every draft — so a reliable client gets warmth and a chronic late payer gets firmer directness.",
      },
      {
        title: "Risk level drives tone",
        body: "Each invoice context includes a risk signal. Higher risk moves the register toward firm/urgent earlier; low risk stays warm longer.",
      },
      {
        title: "Preferred channel awareness",
        body: "Profiles track whether email or WhatsApp fits the client relationship — WhatsApp nudges activate on Pro+ ($39/mo) for clients you've set a reminder phone for.",
      },
      {
        title: "Escalation recommendations",
        body: "On Pro+, the escalation dashboard surfaces invoices that need a human decision — not just another automated email.",
      },
    ],
    howItWorks: [
      {
        name: "Sync invoices and clients",
        text: "Connect QuickBooks or FreshBooks — GentleTap reads payment history from your real ledger.",
      },
      {
        name: "Build the profile",
        text: "As invoices settle, GentleTap updates late rate, days-to-pay, risk level, and channel preference.",
      },
      {
        name: "Draft with context",
        text: "AI uses the profile plus days overdue to write the right tone for this client, this invoice, this step.",
      },
      {
        name: "Escalate when needed",
        text: "Pro+ surfaces recommendations when the pattern says a human should step in.",
      },
    ],
    faq: [
      {
        q: "Does GentleTap score invoice risk?",
        a: "Yes — risk level (informed by payment history and invoice context) shapes tone selection so chronic late payers don't get the same warm nudge as reliable ones.",
      },
      {
        q: "Is client profiling on the free plan?",
        a: "AI drafts use available client context on every plan, including free Starter. Escalation dashboard recommendations are part of Pro+ ($39/mo).",
      },
      {
        q: "How is this different from Chasivo's profiling?",
        a: "Both score behavior. GentleTap's profiles sit on live QuickBooks/FreshBooks data and feed WhatsApp + email sequences that already ship — not CSV-only chasing with WhatsApp on a roadmap.",
      },
    ],
  },

  "send-from-gmail": {
    slug: "send-from-gmail",
    name: "Send from Gmail",
    title: "Payment Reminders Sent From Your Own Gmail",
    metaTitle: "Send Invoice Reminders From Your Gmail — GentleTap",
    metaDescription:
      "GentleTap sends payment reminders from your Gmail address — not a noreply billing inbox. Replies come back to you, deliverability stays high, and reminders read as personal follow-up.",
    keywords: [
      "send payment reminders from gmail",
      "invoice reminders from my email",
      "payment follow up from gmail",
      "gmail invoice chasing",
    ],
    hero: "Reminders from noreply@billing-software.com get ignored. Reminders from you get answered. GentleTap sends from your Gmail, so follow-up lands as personal email.",
    benefits: [
      {
        title: "Replies come back to you",
        body: "When a client answers — 'paying Friday' — it lands in your inbox, in the same thread. No second system to check.",
      },
      {
        title: "Deliverability of a real mailbox",
        body: "Your Gmail address has sending history with your clients. Their filters already trust it.",
      },
      {
        title: "Reads as you, not a platform",
        body: "No third-party branding, no 'sent via' footer. The reminder looks like you sat down and wrote it.",
      },
      {
        title: "Full sent-mail record",
        body: "Every reminder lives in your own Sent folder — the paper trail is yours, not locked in a dashboard.",
      },
    ],
    howItWorks: [
      { name: "Connect Gmail", text: "Authorize sending with one OAuth click — read-only access to nothing else." },
      {
        name: "GentleTap drafts and schedules",
        text: "AI writes each reminder and queues it for the right day in the cadence.",
      },
      {
        name: "Sends as you",
        text: "The email goes out from your Gmail address, into the client's existing thread with you.",
      },
      {
        name: "You see everything",
        text: "Sent reminders appear in your Sent folder and in the GentleTap dashboard timeline.",
      },
    ],
    faq: [
      {
        q: "Does GentleTap read my email?",
        a: "No — the Gmail connection is used to send reminders. It doesn't read or scan your inbox contents.",
      },
      {
        q: "Can I use a custom domain email instead?",
        a: "Yes — besides Gmail, GentleTap supports sending from a verified custom domain address.",
      },
      {
        q: "What if a client replies to a reminder?",
        a: "It comes straight to your Gmail inbox like any reply — you handle the conversation; GentleTap keeps tracking the balance.",
      },
    ],
  },

  "multi-channel-reminders": {
    slug: "multi-channel-reminders",
    name: "Multi-channel reminders",
    title: "Email + WhatsApp Invoice Reminders — Multi-Channel Follow-Up",
    metaTitle: "Multi-Channel Invoice Reminders (Email + WhatsApp) | GentleTap",
    metaDescription:
      "GentleTap sends AI payment reminders from your Gmail, then WhatsApp nudges on Pro+ ($39/mo). Email carries the facts; WhatsApp gets read. Both stop when the invoice is paid.",
    keywords: [
      "multi channel invoice reminders",
      "email whatsapp invoice follow up",
      "multi channel invoice chasing",
      "whatsapp and email payment reminders",
    ],
    hero: "One channel leaks money. GentleTap pairs Gmail-native email with WhatsApp nudges — the combo freelancers actually get answered on.",
    benefits: [
      {
        title: "Email for the record",
        body: "Full reminder — invoice number, amount, payment link — from your Gmail. Replies land in your inbox.",
      },
      {
        title: "WhatsApp for attention",
        body: "On Pro+ ($39/mo), a short nudge follows ~3 hours later on steps 1–3 — the channel that lands on the home screen.",
      },
      {
        title: "Stops on both channels",
        body: "When QuickBooks or FreshBooks shows balance zero, email and WhatsApp both go quiet. No awkward post-payment chase.",
      },
      {
        title: "No SMS spam",
        body: "GentleTap deliberately skips SMS collections blasts. WhatsApp fits international freelancers and existing client chats; SMS stays for tools built for trade crews.",
      },
    ],
    howItWorks: [
      {
        name: "Connect Gmail + accounting",
        text: "Link QuickBooks or FreshBooks and authorize Gmail sending.",
      },
      {
        name: "Email step sends first",
        text: "AI drafts the full reminder and sends from your address on schedule.",
      },
      {
        name: "WhatsApp on Pro+",
        text: "Upgrade to Pro+ ($39/mo) and set a reminder phone — WhatsApp follows the early email steps.",
      },
      {
        name: "Auto-stop everywhere",
        text: "Live balance sync closes both channels the moment payment lands.",
      },
    ],
    faq: [
      {
        q: "Does GentleTap send SMS invoice reminders?",
        a: "No. Channels are email (all plans) and WhatsApp (Pro+ $39/mo and Team). SMS is left to trade-focused tools.",
      },
      {
        q: "What plan unlocks multi-channel?",
        a: "Email is on every plan including free. WhatsApp unlocks on Pro+ at $39/mo (450 msgs/mo) and Team at $59/mo (850 msgs/mo).",
      },
      {
        q: "Is multi-channel better than email-only?",
        a: "For clients you already message on WhatsApp, yes — open rates are dramatically higher. For formal enterprise AP, email alone is usually right.",
      },
    ],
  },

  "whatsapp-reminders": {
    slug: "whatsapp-reminders",
    name: "WhatsApp reminders",
    title: "WhatsApp Payment Reminders — Email First, Then a Nudge",
    metaTitle: "WhatsApp Invoice Reminders — Multi-Channel Follow-Up",
    metaDescription:
      "On Pro+ and Team, GentleTap follows each email reminder with a WhatsApp nudge ~3 hours later on the early steps — the channel clients actually read. Stops on payment, both channels.",
    keywords: [
      "whatsapp invoice reminders",
      "whatsapp payment reminder",
      "multi channel invoice follow up",
      "invoice reminder whatsapp automation",
    ],
    hero: "Your reminder email competes with 120 messages. A WhatsApp nudge lands on the home screen — and gets read in minutes.",
    benefits: [
      {
        title: "Email carries facts, WhatsApp carries the nudge",
        body: "The detailed reminder goes by email with the payment link; WhatsApp is the short tap on the shoulder that surfaces it.",
      },
      {
        title: "Timed to help, not spam",
        body: "WhatsApp follows the email step by roughly three hours on steps 1–3 — one message per step, never a barrage.",
      },
      {
        title: "Stops everywhere at once",
        body: "When the invoice balance hits zero in QuickBooks or FreshBooks, both channels stop — no awkward 'paid this morning' follow-ups.",
      },
      {
        title: "Your number, your relationships",
        body: "Messages come from your business identity and read as a natural continuation of the conversation you already have.",
      },
    ],
    howItWorks: [
      {
        name: "Enable on Pro+ or Team",
        text: "WhatsApp follow-ups are part of the Pro+ and Team plans — email-only on Starter and Pro.",
      },
      {
        name: "Email step sends first",
        text: "The full reminder — invoice number, amount, payment link — goes by email from your Gmail.",
      },
      {
        name: "WhatsApp nudge ~3 hours later",
        text: "On steps 1–3, a short message follows: greeting, invoice reference, pointer to the email.",
      },
      {
        name: "Both stop on payment",
        text: "The moment the balance clears, every channel goes quiet automatically.",
      },
    ],
    faq: [
      {
        q: "Is WhatsApp follow-up professional?",
        a: "For clients you already message there — common for freelancers, agencies, and international clients — a short nudge after the detailed email reads as helpful, not intrusive.",
      },
      {
        q: "Which plans include WhatsApp reminders?",
        a: "Pro+ ($39/mo) and Team ($59/mo). Starter and Pro are email-only.",
      },
      {
        q: "Can I turn off WhatsApp for specific clients?",
        a: "Yes — per-invoice pause and sequence controls let you keep WhatsApp for the clients where it fits and skip it where it doesn't.",
      },
    ],
  },

  "auto-stop-on-payment": {
    slug: "auto-stop-on-payment",
    name: "Auto-stop on payment",
    title: "Reminders That Stop the Moment You're Paid",
    metaTitle: "Auto-Stop Invoice Reminders on Payment — GentleTap",
    metaDescription:
      "GentleTap watches your QuickBooks or FreshBooks invoice balances and stops every reminder the second a payment lands — no more 'I paid yesterday' awkwardness.",
    keywords: [
      "stop invoice reminders when paid",
      "automatic dunning stop payment",
      "invoice balance sync reminders",
      "payment reminder auto stop",
    ],
    hero: "Nothing burns a client relationship like a 'day 7 overdue' email the morning after they paid. GentleTap watches the balance so that never happens.",
    benefits: [
      {
        title: "Balance-checked before every send",
        body: "Each scheduled reminder re-checks the live invoice balance in QuickBooks or FreshBooks before it goes out. Paid means silent.",
      },
      {
        title: "Partial payments handled",
        body: "If the client pays half, the next reminder references the remaining balance — not the original amount.",
      },
      {
        title: "No manual cleanup",
        body: "You never mark anything 'chased' or 'resolved'. The balance is the truth; the sequence follows it.",
      },
      {
        title: "Full timeline either way",
        body: "Every send, skip, and stop is logged per invoice — you can see exactly what a client received and when.",
      },
    ],
    howItWorks: [
      {
        name: "Continuous sync",
        text: "GentleTap syncs invoice balances from QuickBooks or FreshBooks automatically in the background.",
      },
      {
        name: "Pre-send balance check",
        text: "Before any reminder sends, the current balance is verified — zero means the step is skipped.",
      },
      {
        name: "Sequence closes",
        text: "The invoice's sequence marks complete; no further steps schedule.",
      },
      {
        name: "You're notified",
        text: "The dashboard and alerts show the invoice as paid and the chase as done.",
      },
    ],
    faq: [
      {
        q: "How quickly do reminders stop after payment?",
        a: "Balances are re-checked before every scheduled send, so a reminder never goes out after the payment has synced — typically within hours of the payment being recorded.",
      },
      {
        q: "What happens with partial payments?",
        a: "The sequence continues against the remaining balance, and the next reminder references what's still owed rather than the original total.",
      },
      {
        q: "What if I record a payment manually outside QuickBooks/FreshBooks?",
        a: "Record it in your invoicing tool as usual — GentleTap reads the balance from there, so any payment you log stops the sequence.",
      },
    ],
  },
};

export function getFeature(slug: string): Feature | undefined {
  return FEATURES[slug as FeatureSlug];
}

export function getAllFeatures(): Feature[] {
  return FEATURE_SLUGS.map((slug) => FEATURES[slug]);
}
