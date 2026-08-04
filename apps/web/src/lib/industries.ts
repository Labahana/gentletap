/** Vertical landing content — "invoice reminders for X" pages. */

export type IndustrySection = {
  heading: string;
  paragraphs: readonly string[];
};

export type Industry = {
  slug: string;
  audience: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: readonly string[];
  hero: string;
  painPoints: readonly { title: string; body: string }[];
  sections: readonly IndustrySection[];
  faq: readonly { q: string; a: string }[];
};

export const INDUSTRY_SLUGS = [
  "freelancers",
  "agencies",
  "consultants",
  "developers",
  "designers",
  "photographers",
  "contractors",
  "accountants",
  "coaches",
  "lawyers",
] as const;

export type IndustrySlug = (typeof INDUSTRY_SLUGS)[number];

const SHARED_CTA =
  "GentleTap connects to QuickBooks or FreshBooks, drafts each reminder in your voice with AI, sends from your own Gmail, and stops the moment the invoice balance hits zero. Free Starter plan covers 5 collections a month.";

export const INDUSTRIES: Record<IndustrySlug, Industry> = {
  freelancers: {
    slug: "freelancers",
    audience: "Freelancers",
    title: "Invoice Reminders for Freelancers",
    metaTitle: "Invoice Reminders for Freelancers — Automated & Polite",
    metaDescription:
      "Freelancers lose hours every month chasing invoices. GentleTap automates polite follow-up from your Gmail, synced with QuickBooks or FreshBooks — free for 5 collections a month.",
    keywords: [
      "invoice reminders for freelancers",
      "freelancer payment follow up",
      "chase invoices freelance",
      "freelancer accounts receivable",
    ],
    hero: "You didn't go freelance to become a part-time collections agent. Automate the chase and get back to the work clients actually pay for.",
    painPoints: [
      {
        title: "Every chase is unpaid work",
        body: "Writing 'just bumping this up your inbox' emails costs the hours you could bill. Multiply by every client, every month.",
      },
      {
        title: "Follow-up depends on memory",
        body: "When you're deep in delivery, day-3 reminders slip to day 12. Late follow-up reads as terms that don't matter.",
      },
      {
        title: "One bad payer can sink a month",
        body: "Without payroll to fall back on, a single stalled invoice hits rent, tax, and buffer all at once.",
      },
    ],
    sections: [
      {
        heading: "Why freelancers need a different kind of follow-up",
        paragraphs: [
          "Enterprise AR software assumes a finance department. Freelancers need the opposite: something that sounds like you, sends from your own email address, and never makes a client feel processed. The reminder that works is the one that reads like you remembered to send it — even though a system did.",
          SHARED_CTA,
        ],
      },
      {
        heading: "The freelancer follow-up cadence that works",
        paragraphs: [
          "A friendly nudge three days before the due date, a short note on the due date, a direct follow-up at day 3, a firmer one at day 7, and a final notice around day 14. Each message carries the invoice number, amount, and payment link. GentleTap runs this sequence for every invoice automatically, and you can preview the drafts before anything sends.",
        ],
      },
    ],
    faq: [
      {
        q: "How do freelancers chase unpaid invoices professionally?",
        a: "With a fixed cadence of short, factual reminders — pre-due, due date, day 3, day 7, day 14 — each containing the invoice number, amount, and payment link. Consistency matters more than wording.",
      },
      {
        q: "Does GentleTap work if I invoice with QuickBooks Self-Employed or FreshBooks?",
        a: "GentleTap syncs with QuickBooks Online and FreshBooks. It watches invoice balances and runs the reminder sequence until the balance clears.",
      },
      {
        q: "Is there a free plan for freelancers?",
        a: "Yes — the Starter plan is free and covers 5 invoice collections per month, which handles most freelancers' late payers.",
      },
    ],
  },

  agencies: {
    slug: "agencies",
    audience: "Agencies",
    title: "Invoice Reminders for Agencies",
    metaTitle: "Invoice Chasing for Agencies — Automated Follow-Up",
    metaDescription:
      "Agencies carry big retainers and bigger late-payment risk. GentleTap automates invoice follow-up from your Gmail with per-invoice escalation — synced with QuickBooks and FreshBooks.",
    keywords: [
      "invoice chasing for agencies",
      "agency late payments",
      "agency accounts receivable",
      "retainer invoice reminders",
    ],
    hero: "Agency margins live and die on collection speed. Automate follow-up so account managers manage accounts — not overdue invoices.",
    painPoints: [
      {
        title: "Retainers paid late compound",
        body: "A chronically late retainer client quietly turns a 45% margin engagement into a cash-flow loan to the client.",
      },
      {
        title: "Follow-up falls between roles",
        body: "Producers think account managers chase; account managers think finance does. The invoice waits.",
      },
      {
        title: "Big invoices, awkward conversations",
        body: "A $15k overdue invoice strains a relationship you spent a year building. Escalation needs to be calm and documented.",
      },
    ],
    sections: [
      {
        heading: "AR discipline without an AR department",
        paragraphs: [
          "Most agencies under 20 people have nobody whose job is collections — so chasing happens reactively, emotionally, and late. A fixed escalation sequence changes the dynamic: reminders arrive on schedule from whoever owns the relationship, worded like them, and stop the moment payment lands.",
          SHARED_CTA,
        ],
      },
      {
        heading: "Protecting the relationship while escalating",
        paragraphs: [
          "Agency escalation works when it's a change in directness, not tone. Name the facts, offer an out, state the next step — pausing the sprint is usually enough. Because GentleTap sends from your Gmail, the reminder lands in the same thread as your real conversations, not from a faceless billing address.",
        ],
      },
    ],
    faq: [
      {
        q: "How should agencies handle chronically late retainer clients?",
        a: "Move them to upfront billing, apply the documented follow-up cadence without exception, and pause work at day 14. Consistency retrains most clients within two billing cycles.",
      },
      {
        q: "Can different team members send reminders for their own clients?",
        a: "Yes — GentleTap's Team plan supports multiple senders, so each account owner can chase from their own Gmail address.",
      },
      {
        q: "Does GentleTap handle large multi-invoice clients?",
        a: "Each invoice gets its own sequence with per-invoice pause and resume, so a disputed invoice can be held while others continue.",
      },
    ],
  },

  consultants: {
    slug: "consultants",
    audience: "Consultants",
    title: "Invoice Reminders for Consultants",
    metaTitle: "Payment Reminders for Consultants — Chase Less, Bill More",
    metaDescription:
      "Consultants lose billable hours chasing invoices. Automate polite, professional follow-up from your Gmail with GentleTap — synced to QuickBooks or FreshBooks.",
    keywords: [
      "payment reminders for consultants",
      "consultant invoice follow up",
      "consulting late payments",
      "chase consulting invoices",
    ],
    hero: "Your advice bills at a premium — your follow-up shouldn't be where you sound cheapest. Automate reminders that match your professional tone.",
    painPoints: [
      {
        title: "Chasing undercuts authority",
        body: "You sold expertise. Writing 'sorry to bother you' about an overdue invoice erodes the positioning you charged for.",
      },
      {
        title: "Corporate AP cycles ignore your terms",
        body: "Enterprise clients pay on their schedule. Without systematic follow-up, net-30 becomes net-60 by default.",
      },
      {
        title: "Project gaps hide overdue invoices",
        body: "Between engagements, nobody's watching the balance. The invoice ages quietly while you deliver the next project.",
      },
    ],
    sections: [
      {
        heading: "Follow-up that sounds like counsel, not collections",
        paragraphs: [
          "The consultant's reminder dilemma: be firm enough to get paid, measured enough to stay the trusted advisor. The fix is a documented cadence — pre-due nudge, due-date note, day-3 and day-7 follow-ups — worded factually and sent on schedule. Calm consistency reads as process, not pressure.",
          SHARED_CTA,
        ],
      },
      {
        heading: "Working with corporate AP instead of against it",
        paragraphs: [
          "Ask upfront who processes payment and CC them on invoices. GentleTap keeps the reminder thread alive automatically — including pre-due nudges that prompt your contact to nudge AP internally, which moves enterprise invoices faster than any external email.",
        ],
      },
    ],
    faq: [
      {
        q: "How do consultants get corporate clients to pay on time?",
        a: "Invoice the day a milestone is accepted, CC the AP contact, use net-30 with a documented reminder cadence, and send a pre-due nudge so your contact can prompt AP internally.",
      },
      {
        q: "Can reminders go from my own email address?",
        a: "Yes — GentleTap sends from your Gmail, so reminders appear as personal follow-up from you, not automated billing mail from a third party.",
      },
      {
        q: "What if an invoice is genuinely disputed?",
        a: "Pause that invoice's sequence with one click, resolve the dispute, then resume — the cadence picks up where it left off.",
      },
    ],
  },

  developers: {
    slug: "developers",
    audience: "Freelance developers",
    title: "Invoice Reminders for Freelance Developers",
    metaTitle: "Invoice Reminders for Freelance Developers — Automated",
    metaDescription:
      "Freelance developers: stop context-switching into collections mode. GentleTap automates invoice follow-up from your Gmail, synced with QuickBooks or FreshBooks.",
    keywords: [
      "invoice reminders for developers",
      "freelance developer late payment",
      "developer invoice follow up",
      "contract developer unpaid invoice",
    ],
    hero: "Context-switching into collections mode costs more than the invoice. Automate the follow-up; stay in flow.",
    painPoints: [
      {
        title: "Deep work and chasing don't mix",
        body: "Every 'quick reminder email' breaks a flow state that takes 20 minutes to rebuild. Multiply by every open invoice.",
      },
      {
        title: "Scope creep meets payment creep",
        body: "The client who expanded the sprint twice is the same one whose invoice goes quiet at delivery.",
      },
      {
        title: "Handover leverage disappears fast",
        body: "Once the code is deployed, your leverage is the reminder process — and only if it actually runs.",
      },
    ],
    sections: [
      {
        heading: "Why developers are chronically under-chased",
        paragraphs: [
          "Developers systematically under-follow-up because the task competes with deep work and loses. The fix isn't discipline; it's removing the task. A scheduled sequence — pre-due nudge, due date, day 3, day 7, day 14 — runs regardless of what's in your IDE.",
          SHARED_CTA,
        ],
      },
      {
        heading: "Protect your leverage before you need it",
        paragraphs: [
          "Milestone billing and deposits handle prevention; the reminder cadence handles the rest. Pause delivery on invoices past day 14 — stated calmly in your terms — and most developer invoices never reach escalation.",
        ],
      },
    ],
    faq: [
      {
        q: "Should freelance developers invoice weekly or on milestones?",
        a: "Milestones for fixed-fee work, two-week cycles for retainers. Shorter cycles shrink the amount at risk on any single invoice.",
      },
      {
        q: "How do I chase a client without souring a long-term contract?",
        a: "Use a fixed, documented cadence sent on schedule — clients read consistent process as professionalism, and GentleTap runs it in your voice from your Gmail.",
      },
      {
        q: "What if the client disputes hours after delivery?",
        a: "Pause the invoice's sequence, resolve with your time records, then resume. Per-invoice pause keeps the rest of your follow-up running.",
      },
    ],
  },

  designers: {
    slug: "designers",
    audience: "Freelance designers",
    title: "Invoice Reminders for Freelance Designers",
    metaTitle: "Invoice Chasing for Freelance Designers — Gentle & Automatic",
    metaDescription:
      "Designers: chasing invoices feels off-brand, and that's exactly why it doesn't happen. GentleTap automates polite follow-up from your Gmail — synced with QuickBooks or FreshBooks.",
    keywords: [
      "invoice chasing for designers",
      "freelance designer late payment",
      "designer invoice follow up",
      "creative freelancer unpaid invoice",
    ],
    hero: "You obsess over every pixel — then send 'sorry to bug you!!' emails about money. Let a system handle the follow-up with the same care you put into the work.",
    painPoints: [
      {
        title: "Chasing feels off-brand",
        body: "Designers sell taste and ease. Anxious follow-up emails feel like they undo the client experience — so they don't get sent.",
      },
      {
        title: "Final files, final leverage",
        body: "Once assets are handed over, payment depends entirely on whether someone remembers to ask.",
      },
      {
        title: "Revision-heavy projects blur 'done'",
        body: "When the project never feels finished, the invoice never feels due — and payment drifts.",
      },
    ],
    sections: [
      {
        heading: "Follow-up as part of the client experience",
        paragraphs: [
          "A well-worded reminder isn't off-brand — it's the same professionalism as your proposals and handover docs. Short, warm, on schedule: the cadence itself signals a well-run studio. The designers who get paid fastest aren't pushier; they're more systematic.",
          SHARED_CTA,
        ],
      },
      {
        heading: "Structure projects so chasing is rarely needed",
        paragraphs: [
          "Deposits, milestone invoices tied to approved stages, and final files released against the final balance. GentleTap covers the tail: the polite nudges before and after each due date that keep 'drifting' payments from becoming 'forgotten' ones.",
        ],
      },
    ],
    faq: [
      {
        q: "How do designers ask for payment without sounding desperate?",
        a: "Short, factual, scheduled: invoice number, amount, payment link, sent on a fixed cadence. Process reads as professionalism; anxiety reads as desperation.",
      },
      {
        q: "Should designers withhold final files until payment?",
        a: "Common practice: release watermarked or low-res finals until the balance clears, and state it in your terms upfront so it's process, not a surprise.",
      },
      {
        q: "Can reminders match my studio's tone?",
        a: "Yes — GentleTap drafts in your voice from your history, and you can preview and edit drafts before the first send.",
      },
    ],
  },

  photographers: {
    slug: "photographers",
    audience: "Photographers",
    title: "Invoice Reminders for Photographers",
    metaTitle: "Payment Reminders for Photographers — Automated Follow-Up",
    metaDescription:
      "Photographers juggle shoots, edits, and galleries — chasing invoices gets dropped. GentleTap automates polite payment follow-up from your Gmail, synced with QuickBooks or FreshBooks.",
    keywords: [
      "payment reminders for photographers",
      "photographer late payment",
      "photography invoice follow up",
      "wedding photographer unpaid invoice",
    ],
    hero: "Between shoots, edits, and galleries, the invoice follow-up is the first thing dropped — and the thing that pays for everything else.",
    painPoints: [
      {
        title: "Seasonal surges bury admin",
        body: "In busy season you're shooting daily; in quiet season you're marketing. Follow-up falls through both.",
      },
      {
        title: "Emotional clients, awkward money talk",
        body: "Chasing a couple for a wedding balance feels impossible — so it waits months.",
      },
      {
        title: "Galleries delivered, leverage gone",
        body: "Once the photos are in the client's hands, payment depends on your process — or their memory.",
      },
    ],
    sections: [
      {
        heading: "A reminder process that survives wedding season",
        paragraphs: [
          "Photography cash flow is seasonal, which makes collection speed matter twice as much. A fixed cadence — pre-due nudge, due date, day 3, day 7 — sends whether you shot three weddings that weekend or none. The sequence doesn't care how full your calendar is.",
          SHARED_CTA,
        ],
      },
      {
        heading: "Chasing emotional-event clients gracefully",
        paragraphs: [
          "For weddings and family work, reminders should be brief, warm, and factual — invoice number, amount, link. GentleTap's AI drafts in that register, sends from your Gmail as you, and stops the moment the balance clears, so nothing ever reads as a collections notice for someone's wedding.",
        ],
      },
    ],
    faq: [
      {
        q: "When should photographers invoice clients?",
        a: "Booking retainer on signing, balance due before or at gallery delivery. Tie the final gallery release to the final payment in your contract.",
      },
      {
        q: "How do I chase a wedding couple without it feeling awful?",
        a: "Short, warm, scheduled reminders that read as studio admin — not personal pressure. A fixed cadence from a system is easier on everyone than one anxious email.",
      },
      {
        q: "Does GentleTap work with my existing invoicing?",
        a: "GentleTap syncs with QuickBooks and FreshBooks invoices and follows up until each balance clears — no need to change how you invoice.",
      },
    ],
  },

  contractors: {
    slug: "contractors",
    audience: "Contractors & trades",
    title: "Invoice Reminders for Contractors & Trades",
    metaTitle: "Invoice Chasing for Contractors — Get Paid for Finished Jobs",
    metaDescription:
      "Contractors finish the job and wait 30-60 days to get paid. GentleTap automates invoice follow-up from your Gmail, synced with QuickBooks or FreshBooks — polite, persistent, automatic.",
    keywords: [
      "invoice chasing for contractors",
      "contractor late payment",
      "trades invoice follow up",
      "construction payment reminders",
    ],
    hero: "You finished the job weeks ago. The materials, the crew, the fuel — all paid for. The only thing missing is the payment.",
    painPoints: [
      {
        title: "Materials float eats margin",
        body: "You've already paid for supplies and labor. Every late week on the invoice is an interest-free loan to the client.",
      },
      {
        title: "Office work happens at 9pm",
        body: "Invoices and follow-up compete with the next job site. Admin loses; receivables age.",
      },
      {
        title: "GCs and homeowners pay on different planets",
        body: "Commercial GCs run 45-60 day cycles; homeowners forget the invoice exists. Both need different follow-up.",
      },
    ],
    sections: [
      {
        heading: "Follow-up that runs while you're on site",
        paragraphs: [
          "Contractor AR fails because follow-up requires office time that doesn't exist. A scheduled sequence — pre-due, due date, day 3, day 7, day 14 — sends from your email whether you're on a roof or in a truck. Persistence stops depending on your evenings.",
          SHARED_CTA,
        ],
      },
      {
        heading: "Different cadences for GCs vs homeowners",
        paragraphs: [
          "Homeowners respond to friendly, frequent nudges with a payment link. GCs respond to documentation: invoice number, PO reference, and a calm escalation trail. Either way, consistent follow-up moves your invoice up the pile — the quiet invoice is always the one paid last.",
        ],
      },
    ],
    faq: [
      {
        q: "How do contractors get homeowners to pay faster?",
        a: "Invoice the day the job completes, include a payment link, and run short friendly reminders on a fixed cadence. Most homeowner delays are forgetfulness, not avoidance.",
      },
      {
        q: "What about commercial GCs with 60-day cycles?",
        a: "Set terms to match the real cycle, invoice with full documentation (PO, lien-compliant details), and let the cadence run — internal AP nudges from your contact move faster than external pressure.",
      },
      {
        q: "Can GentleTap handle progress billing?",
        a: "Yes — each progress invoice gets its own sequence with its own due date, and you can pause any invoice individually.",
      },
    ],
  },

  accountants: {
    slug: "accountants",
    audience: "Accountants & bookkeepers",
    title: "Invoice Reminders for Accountants & Bookkeepers",
    metaTitle: "Invoice Follow-Up for Accountants & Bookkeepers",
    metaDescription:
      "Accountants chase everyone else's receivables while their own invoices age. GentleTap automates your firm's invoice follow-up from Gmail — synced with QuickBooks or FreshBooks.",
    keywords: [
      "invoice follow up for accountants",
      "accounting firm late payments",
      "bookkeeper invoice chasing",
      "CPA firm accounts receivable",
    ],
    hero: "You spend all day fixing other people's receivables — while your own invoices quietly age past 60 days.",
    painPoints: [
      {
        title: "The cobbler's children problem",
        body: "Firms advise clients on AR discipline, then let their own invoices drift because client work always comes first.",
      },
      {
        title: "Busy season suspends all admin",
        body: "From January to April, follow-up stops entirely — and Q2 starts with a pile of aged invoices.",
      },
      {
        title: "Chasing feels professionally awkward",
        body: "The advisor chasing their own client for money inverts the relationship. Most firms under-chase as a result.",
      },
    ],
    sections: [
      {
        heading: "Practice what you advise",
        paragraphs: [
          "The same discipline you recommend to clients — documented terms, scheduled reminders, escalation path — applies to your own invoices. The difference is you can automate yours in an afternoon. A fixed cadence running from the partner's or practice email keeps the firm's own DSO inside terms, even in busy season.",
          SHARED_CTA,
        ],
      },
      {
        heading: "Reminders that preserve the advisor relationship",
        paragraphs: [
          "Firm follow-up should read as practice administration, not personal pressure: short, factual, scheduled. GentleTap drafts in that register and sends from your Gmail as you — clients experience it as a well-run firm, which is exactly the brand.",
        ],
      },
    ],
    faq: [
      {
        q: "Should accounting firms charge late fees?",
        a: "Include the clause in the engagement letter and apply the policy consistently — or use it as waivable leverage. A policy applied selectively trains clients to pay late.",
      },
      {
        q: "How do firms chase clients during busy season?",
        a: "Automate it. A scheduled reminder cadence runs through tax season without touching partner time, and resumes normal chasing automatically in May.",
      },
      {
        q: "Can reminders go from individual partners' emails?",
        a: "Yes — GentleTap's Team plan supports multiple senders, so each partner or manager chases from their own Gmail.",
      },
    ],
  },

  coaches: {
    slug: "coaches",
    audience: "Coaches",
    title: "Invoice Reminders for Coaches",
    metaTitle: "Payment Reminders for Coaches — Polite, Automatic Follow-Up",
    metaDescription:
      "Coaches: chasing payment for coaching packages feels personal — because it is. GentleTap automates gentle invoice follow-up from your Gmail, synced with QuickBooks or FreshBooks.",
    keywords: [
      "payment reminders for coaches",
      "coaching invoice follow up",
      "life coach late payment",
      "business coach unpaid invoice",
    ],
    hero: "The coaching relationship is built on trust — which is exactly why chasing payment feels so wrong, and why it so often doesn't happen.",
    painPoints: [
      {
        title: "Chasing feels like it breaks the container",
        body: "You're the person they open up to. Sending 'your invoice is overdue' feels like a betrayal of the space — so it waits.",
      },
      {
        title: "Package balances stretch out",
        body: "The final installments of a 3-month package drift weeks past schedule with no system to catch them.",
      },
      {
        title: "Solo practice means solo admin",
        body: "No billing department, no office manager — just you, between sessions, remembering to chase.",
      },
    ],
    sections: [
      {
        heading: "Follow-up that protects the relationship",
        paragraphs: [
          "The fix for 'chasing feels wrong' is making it feel like nothing: a short, warm, scheduled nudge — invoice number, amount, link — that reads as practice admin, not personal pressure. Clients who respect your work respect your process; the ones who don't are telling you something.",
          SHARED_CTA,
        ],
      },
      {
        heading: "Set the structure once, at signup",
        paragraphs: [
          "Package payment schedules in writing, first installment before session one, and automated reminders on every installment. When follow-up is part of the container from day one, late payment stops being a conversation you have to have — the system handles it.",
        ],
      },
    ],
    faq: [
      {
        q: "How do coaches ask clients for overdue payment gracefully?",
        a: "Brief, warm, factual — the invoice number and payment link, sent on a schedule. Treat it as practice administration; clients follow your lead on whether it's awkward.",
      },
      {
        q: "Should coaches require payment upfront?",
        a: "For packages: first installment before session one, with the schedule in the agreement. Upfront structure prevents nearly all chasing.",
      },
      {
        q: "Can reminders pause if a client is going through something?",
        a: "Yes — pause any invoice's sequence with one click and resume when appropriate. The rest of your follow-up keeps running.",
      },
    ],
  },

  lawyers: {
    slug: "lawyers",
    audience: "Solo & small-firm lawyers",
    title: "Invoice Reminders for Lawyers",
    metaTitle: "Invoice Follow-Up for Solo & Small-Firm Lawyers",
    metaDescription:
      "Small-firm lawyers write demand letters for clients while their own invoices sit unpaid. GentleTap automates professional invoice follow-up from your Gmail — synced with QuickBooks or FreshBooks.",
    keywords: [
      "invoice follow up for lawyers",
      "law firm late payment",
      "attorney unpaid invoice",
      "small law firm collections",
    ],
    hero: "You've drafted demand letters for everyone else's receivables. Your own invoices deserve the same discipline — and none of your billable time.",
    painPoints: [
      {
        title: "Non-billable chasing is pure loss",
        body: "Every hour of follow-up is an hour you can't bill — at rates that make the math painful.",
      },
      {
        title: "Matter ends, attention moves on",
        body: "Once the matter closes, the invoice competes with active cases. Closed files don't remind you to chase them.",
      },
      {
        title: "Client relationship outlives the matter",
        body: "Aggressive chasing risks referrals and future work; under-chasing risks the fee. The register matters.",
      },
    ],
    sections: [
      {
        heading: "Collections discipline without collections overhead",
        paragraphs: [
          "Small firms run lean: no AR department, and the alternative to automation is partner time. A documented cadence — pre-due, due date, day 3, day 7, day 14, final notice — runs on schedule, worded professionally, from your own email. The escalation trail it creates is also exactly the documentation you'd want if a fee dispute ever reached further.",
          SHARED_CTA,
        ],
      },
      {
        heading: "The register that fits legal practice",
        paragraphs: [
          "Firm reminders should be formal, factual, and unemotional — invoice number, amount, days outstanding, payment link. GentleTap drafts in that register and stops on payment, so nothing ever reads as personal pressure on a client you want back next quarter.",
        ],
      },
    ],
    faq: [
      {
        q: "When should a law firm escalate an unpaid invoice?",
        a: "Follow your engagement letter: reminders through day 14–21, final notice, then your stated consequence. The documented reminder trail matters as much as the outcome.",
      },
      {
        q: "Do reminder emails create ethical issues for attorneys?",
        a: "Routine billing follow-up is standard practice — keep it factual and consistent with your fee agreement. For contested fees, pause automated reminders and handle directly.",
      },
      {
        q: "Can each attorney chase from their own address?",
        a: "Yes — GentleTap's Team plan supports multiple senders, so each attorney follows up from their own Gmail.",
      },
    ],
  },
};

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES[slug as IndustrySlug];
}

export function getAllIndustries(): Industry[] {
  return INDUSTRY_SLUGS.map((slug) => INDUSTRIES[slug]);
}
