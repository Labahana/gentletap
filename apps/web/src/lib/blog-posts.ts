/** Long-form editorial content for the GentleTap blog — problem-awareness cluster. */

export type BlogPostSection = {
  heading: string;
  paragraphs: readonly string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: readonly string[];
  excerpt: string;
  datePublished: string;
  dateModified?: string;
  readMinutes: number;
  intro: string;
  sections: readonly BlogPostSection[];
  faq: readonly { q: string; a: string }[];
  related: readonly string[];
};

export const BLOG_POST_SLUGS = [
  "stop-chasing-invoices",
  "late-payment-statistics-2026",
  "get-paid-faster-freelancer",
  "why-clients-pay-late",
  "client-wont-pay-what-to-do",
  "freelancer-cash-flow-management",
  "payment-terms-that-get-you-paid",
  "whatsapp-invoice-reminders",
] as const;

export type BlogPostSlug = (typeof BLOG_POST_SLUGS)[number];

export const BLOG_POSTS: Record<BlogPostSlug, BlogPost> = {
  "stop-chasing-invoices": {
    slug: "stop-chasing-invoices",
    title: "How to Stop Chasing Invoices: The Complete 2026 Guide",
    metaTitle: "How to Stop Chasing Invoices for Good (2026 Guide)",
    metaDescription:
      "Tired of chasing overdue invoices? This complete guide covers prevention, reminder timing, escalation scripts, and automation so freelancers get paid without the awkward follow-up.",
    keywords: [
      "how to stop chasing invoices",
      "invoice chasing",
      "chase unpaid invoices",
      "automate invoice reminders",
      "get paid on time freelancer",
    ],
    excerpt:
      "Chasing invoices is the part of freelancing nobody warns you about. Here's the complete system — prevention, timing, scripts, and automation — to make the chase disappear.",
    datePublished: "2026-07-14",
    readMinutes: 9,
    intro:
      "You finished the work, sent the invoice, and then… silence. If you bill clients, you know the second job nobody applied for: collections. The average freelancer spends hours every month writing 'just bumping this up your inbox' emails. This guide replaces that ritual with a system — four parts, in order: prevent, remind, escalate, automate.",
    sections: [
      {
        heading: "Part 1 — Prevent: make late payment hard before you invoice",
        paragraphs: [
          "Most late payments are designed in at the start of the engagement, not the end. Vague scope, no deposit, and 'net whenever' terms invite delays. Three fixes: take a deposit (30–50% for new clients), put the payment term and late-follow-up policy directly on the proposal and invoice, and invoice the same day the milestone is accepted — not at month-end.",
          "Deposits do more than protect cash flow; they filter clients. A client who pushes back hard on any deposit is telling you how the final invoice will go. For fixed-fee work, milestone billing (50/25/25) keeps the unpaid balance small enough that a late payment stings less.",
        ],
      },
      {
        heading: "Part 2 — Remind: the timing that actually works",
        paragraphs: [
          "The data pattern across AR research is consistent: invoices reminded politely before or on the due date get paid dramatically faster than invoices chased a week after. A proven cadence for freelancers: a friendly nudge 3 days before due date, a short 'due today' note on the due date, a direct but warm follow-up at day 3 overdue, a firmer message at day 7, and a final notice at day 14–21.",
          "Every message should carry the same three things: the invoice number, the amount, and a one-click way to pay. The moment a client has to search for the invoice or ask how to pay, you've added days. Keep each email short — three sentences beat three paragraphs.",
        ],
      },
      {
        heading: "Part 3 — Escalate: firm without torching the relationship",
        paragraphs: [
          "Escalation is a change in directness, not tone. You stay polite; you remove the option to ignore you. Name the facts plainly: 'Invoice 1042 for $2,400 was due June 30 and is now 10 days overdue.' Offer an out: 'If there's a hold-up on your side, tell me and we'll sort it.' Then state the next step and date: pausing work, late fee per your terms, or involving a collections service.",
          "Whatever next step you name, do it. One kept consequence teaches a client your terms are real; three unkept threats teach them the opposite. For most clients, a calm day-7 email that names facts is enough — the majority of late payers are disorganized, not malicious.",
        ],
      },
      {
        heading: "Part 4 — Automate: never think about it again",
        paragraphs: [
          "Everything above is a repeatable process, which means it can run without you. QuickBooks and FreshBooks both have basic built-in reminders — limited steps, template text, sent from their servers. That covers light chasing. If you want the full cadence with messages that sound like you, an AR follow-up tool does the whole loop: watch the balance, send the right message at the right step, stop the moment payment lands.",
          "GentleTap was built exactly for this: connect QuickBooks or FreshBooks, and AI drafts each step from your client history and how overdue the invoice is — sent from your own Gmail so replies come back to you. The free Starter plan covers 5 collections a month. Whatever tool you choose, the goal is the same: the chase happens whether or not you remember, and you never write 'bumping this up' again.",
        ],
      },
    ],
    faq: [
      {
        q: "How many reminders should I send before giving up?",
        a: "Four to five well-timed messages (pre-due through day 14–21) resolve the vast majority of late invoices. After that, move to your stated consequence — late fee, work pause, or collections — rather than a sixth email.",
      },
      {
        q: "Will chasing invoices damage client relationships?",
        a: "Polite, professional follow-up almost never does — clients expect to be reminded; it's in their own AP process too. What damages relationships is silence followed by a frustrated outburst. Calm, early, factual reminders are relationship-safe.",
      },
      {
        q: "Should I charge late fees?",
        a: "Only if the late fee was in your signed terms — you can't add it retroactively. Many freelancers skip collecting the fee but use it as leverage: 'I'll waive the 1.5% fee if payment lands this week.'",
      },
      {
        q: "What day of the week is best to send reminders?",
        a: "Tuesday through Thursday mornings get the fastest responses for B2B invoices. Avoid Friday afternoon and Monday before 10am — your email lands in a queue and ages.",
      },
    ],
    related: ["why-clients-pay-late", "client-wont-pay-what-to-do", "payment-terms-that-get-you-paid"],
  },

  "late-payment-statistics-2026": {
    slug: "late-payment-statistics-2026",
    title: "Late Payment Statistics 2026: What the Data Says",
    metaTitle: "Late Payment Statistics 2026 — Freelancers & SMBs",
    metaDescription:
      "The latest late payment data for 2026: how much small businesses are owed, average days late, cash-flow impact, and what actually speeds up payment. Sourced from Xero, Atradius, QuickBooks, and US Bank research.",
    keywords: [
      "late payment statistics 2026",
      "unpaid invoices statistics",
      "small business late payments",
      "average days invoices paid late",
      "freelancer late payment data",
    ],
    excerpt:
      "How big is the late-payment problem in 2026? We pulled the key numbers from Xero, Atradius, Intuit, and small-business research — and what they mean for your invoicing process.",
    datePublished: "2026-07-02",
    dateModified: "2026-08-01",
    readMinutes: 7,
    intro:
      "Late payment isn't a personal failing of your clients — it's a structural feature of B2B commerce. This page collects the most-cited research on late payments so you can benchmark your own situation and build a process that beats the averages. Figures are from third-party studies (Xero, Atradius, Intuit QuickBooks, US Bank, Freelancers Union); methodologies differ, so treat them as directional rather than exact.",
    sections: [
      {
        heading: "The headline numbers",
        paragraphs: [
          "Xero and US Bank's widely-cited research estimated that small businesses globally are owed around $825 billion in unpaid invoices at any given time. Atradius' Payment Practices Barometer has consistently found that roughly half of B2B invoices are paid late, and Intuit QuickBooks' small-business surveys report that the average small business carries thousands of dollars in outstanding receivables at any moment.",
          "For freelancers specifically, Freelancers Union research has found that about 7 in 10 independent workers have struggled to collect payment from a client at least once. If you've ever chased an invoice, you're in the majority — not the exception.",
        ],
      },
      {
        heading: "How late is 'late'?",
        paragraphs: [
          "Across AR benchmark studies, B2B invoices commonly settle 7–30 days past their stated terms, with smaller buyers' invoices skewing longer. Net-30 invoices paid in 45–60 days are routine in many industries; enterprise AP departments often run their own payment cycles regardless of your terms.",
          "The practical implication: your reminder process matters more than your terms label. An invoice with net-14 terms and no follow-up routinely loses to an identical invoice with a polite pre-due reminder.",
        ],
      },
      {
        heading: "What late payments cost beyond the balance",
        paragraphs: [
          "The unpaid amount is only part of the damage. US Bank's frequently-cited small-business research attributes around 82% of small business failures to cash-flow problems — not lack of profit. Slow receivables force owners into credit lines, delay their own supplier payments, and consume owner time: chasing is unpaid administrative work that scales with every client you add.",
          "There's also an opportunity cost in the relationship itself. Businesses that dread invoicing a client start discounting, over-delivering, or avoiding follow-up — all of which compound the original delay.",
        ],
      },
      {
        heading: "What actually moves the needle",
        paragraphs: [
          "Consistent findings across the research: invoices with payment links get paid faster than invoices requiring manual payment; reminders sent before the due date outperform reminders sent after it; and multi-step reminder sequences recover the large majority of late invoices without escalation. Automation matters most for consistency — the difference between a reminder that always sends on day 3 and one that sends 'when you remember' is measured in weeks of DSO.",
          "This is the exact gap GentleTap automates: it watches QuickBooks or FreshBooks balances, sends polite pre-due and overdue follow-ups from your own Gmail, and stops the moment payment lands. The free Starter plan covers 5 collections a month.",
        ],
      },
    ],
    faq: [
      {
        q: "What percentage of invoices are paid late?",
        a: "Atradius' Payment Practices Barometer has consistently reported that around half of B2B invoices are paid after their due date. Rates vary by country and industry, but 'half' is a reasonable planning assumption.",
      },
      {
        q: "How much are small businesses owed in unpaid invoices?",
        a: "Xero and US Bank research put the figure near $825 billion globally for small businesses. Individual surveys of US SMBs commonly find average outstanding receivables in the tens of thousands per business.",
      },
      {
        q: "Do reminder emails actually speed up payment?",
        a: "Yes — consistently, across AR benchmark data. Pre-due-date reminders and multi-step sequences are among the strongest predictors of faster settlement, ahead of stricter terms language alone.",
      },
      {
        q: "What is DSO and what's a good number?",
        a: "DSO (days sales outstanding) is the average number of days between invoicing and payment. For freelancers and small service businesses, keeping DSO within ~7–10 days of your stated terms is a healthy target.",
      },
    ],
    related: ["stop-chasing-invoices", "freelancer-cash-flow-management", "why-clients-pay-late"],
  },

  "get-paid-faster-freelancer": {
    slug: "get-paid-faster-freelancer",
    title: "How Freelancers Can Get Paid Faster (Without Being Awkward)",
    metaTitle: "How to Get Paid Faster as a Freelancer — No Awkwardness",
    metaDescription:
      "Practical, non-awkward ways freelancers get paid faster: deposits, invoicing timing, payment links, reminder cadences, and automation that follows up for you.",
    keywords: [
      "how to get paid faster as freelancer",
      "freelancer get paid on time",
      "speed up client payments",
      "freelance invoice tips",
    ],
    excerpt:
      "Getting paid faster isn't about being pushier — it's about removing friction and making follow-up automatic. Eight tactics that work without a single awkward conversation.",
    datePublished: "2026-06-23",
    readMinutes: 7,
    intro:
      "Most advice on getting paid faster boils down to 'chase harder,' which is why most freelancers ignore it — chasing feels awkward. But the tactics that actually shorten payment time are structural, not confrontational. Here are eight that work quietly.",
    sections: [
      {
        heading: "1. Take a deposit from every new client",
        paragraphs: [
          "A 30–50% deposit changes the psychology of the whole engagement: the client has skin in the game, and the final balance is small enough to clear quickly. Clients who refuse any deposit are the same clients who disappear at invoice time — the deposit is a filter, not just cash flow.",
        ],
      },
      {
        heading: "2. Invoice the same day work is accepted",
        paragraphs: [
          "Every day between acceptance and invoicing is a day added to when you're paid — for free. Make invoicing part of delivering the work, not a monthly admin task. The invoice that arrives while the client is still delighted gets prioritized.",
        ],
      },
      {
        heading: "3. Put a payment link on every invoice",
        paragraphs: [
          "Friction kills speed. If paying you requires logging into a bank, finding details, or asking a question, the invoice goes to the 'later' pile. A one-click payment link (card or ACH) in the invoice and in every reminder removes every excuse. QuickBooks Payments, Stripe, and PayPal links all work.",
        ],
      },
      {
        heading: "4. Remind before the due date, not after",
        paragraphs: [
          "The single highest-leverage habit: a friendly nudge 2–3 days before the due date. It reads as helpful, not as chasing — 'Invoice 1042 for $1,800 is due Thursday; here's the link if you want to knock it out early.' Pre-due reminders consistently outperform any overdue email.",
        ],
      },
      {
        heading: "5. Use a fixed reminder cadence",
        paragraphs: [
          "Decide your steps once — pre-due, due date, day 3, day 7, day 14 — and follow them for every client, every invoice. Consistency removes the emotion: you're not 'chasing,' you're running a process. Clients also learn your process is real, which itself speeds payment over time.",
        ],
      },
      {
        heading: "6. Keep every reminder to three sentences",
        paragraphs: [
          "Invoice number, amount, payment link. Long apologetic emails get skimmed and postponed; short factual ones get forwarded to whoever pays. Warmth lives in the greeting, brevity does the work.",
        ],
      },
      {
        heading: "7. Offer to split genuinely hard invoices",
        paragraphs: [
          "When a good client hits a cash crunch, offering two installments converts a stalled invoice into scheduled payments — and preserves the relationship. Get the new dates in writing and treat them as new mini-invoices with their own reminders.",
        ],
      },
      {
        heading: "8. Automate the whole loop",
        paragraphs: [
          "The reason freelancers don't follow up consistently is that follow-up depends on remembering. Automation fixes that: GentleTap connects to QuickBooks or FreshBooks, drafts each reminder with AI (referencing the client and how overdue things are), sends from your own Gmail, and stops when the balance clears. Free Starter covers 5 collections a month — most freelancers never outgrow it.",
        ],
      },
    ],
    faq: [
      {
        q: "How can freelancers get clients to pay on time?",
        a: "Combine structure (deposits, same-day invoicing, payment links) with consistent follow-up (pre-due reminders and a fixed cadence). Both matter — structure prevents, cadence catches what prevention misses.",
      },
      {
        q: "Is it rude to remind a client before the due date?",
        a: "No — framed as a helpful nudge with the payment link, pre-due reminders read as organized, not pushy. They're standard practice in professional AR.",
      },
      {
        q: "What's the fastest single change to get paid sooner?",
        a: "Add a one-click payment link to every invoice and every reminder. Reducing payment friction shortens time-to-pay more than any wording change.",
      },
    ],
    related: ["stop-chasing-invoices", "payment-terms-that-get-you-paid", "freelancer-cash-flow-management"],
  },

  "why-clients-pay-late": {
    slug: "why-clients-pay-late",
    title: "Why Your Clients Pay Late (And How to Fix It)",
    metaTitle: "Why Clients Pay Invoices Late — And How to Fix Each Cause",
    metaDescription:
      "The psychology of late payments: the five real reasons clients pay invoices late — disorganization, approval chains, cash flow, friction, and silence — and the specific fix for each.",
    keywords: [
      "why clients pay late",
      "psychology of late payments",
      "client won't pay invoice",
      "late paying clients",
    ],
    excerpt:
      "Late payment feels personal but rarely is. Clients pay late for five predictable reasons — and each has a specific counter. Learn the psychology, fix the system.",
    datePublished: "2026-06-10",
    readMinutes: 8,
    intro:
      "When an invoice goes quiet, it's easy to assume the worst: the client is dodging you, didn't value the work, or can't pay. In practice, late payment is almost always boring. Understanding the five real causes turns an emotional problem into a mechanical one — with a specific fix for each.",
    sections: [
      {
        heading: "Cause 1: Disorganization (the most common)",
        paragraphs: [
          "Most late payers aren't avoiding you — they lost the email, meant to pay, and forgot. Small businesses rarely have an AP department; the invoice sits in an inbox behind 400 others.",
          "Fix: polite, persistent reminders with the invoice number, amount, and payment link every time. You're not nagging; you're resurfacing. Pre-due and day-3 reminders exist precisely for this majority.",
        ],
      },
      {
        heading: "Cause 2: The approval chain",
        paragraphs: [
          "At larger companies, your contact doesn't pay you — finance does, after your contact approves, a manager countersigns, and AP schedules a run. Your invoice can be 'approved' and still sit two weeks in a queue.",
          "Fix: ask upfront who processes payment and CC them on invoices. When chasing, ask your contact to nudge internally — an internal ping moves faster than your external one. Build the chain's latency into your terms (net-30 instead of net-14 for enterprise clients).",
        ],
      },
      {
        heading: "Cause 3: Their cash flow, not yours",
        paragraphs: [
          "Some clients pay late because they're waiting to be paid themselves. This isn't an excuse, but it is information: a client in a cash squeeze will pay whoever makes it easiest and least painful.",
          "Fix: make paying you the path of least resistance (one-click links), and offer installments for genuinely strained good clients — two scheduled payments beat one hypothetical one.",
        ],
      },
      {
        heading: "Cause 4: Payment friction",
        paragraphs: [
          "Every extra step — find the invoice, log into the bank, ask for details, cut a check — adds days. Friction is invisible to you but decisive for the payer.",
          "Fix: payment links on the invoice and in every reminder, multiple payment methods (card + ACH), and the amount and number in the subject line so nothing needs to be opened to be actioned.",
        ],
      },
      {
        heading: "Cause 5: Strategic silence (the rare one)",
        paragraphs: [
          "A small minority deprioritize suppliers who don't follow up. If you never chase, you teach these clients that your invoice is the flexible one in their stack — the one that can wait.",
          "Fix: a consistent, professional cadence. When follow-up reliably arrives at day 3, 7, and 14 — calm and factual — your invoice moves up the pile. Automation helps here precisely because it never forgets: GentleTap runs the sequence from your Gmail whether you're watching or not.",
        ],
      },
    ],
    faq: [
      {
        q: "Is it unprofessional to chase an invoice?",
        a: "No — every professional AP function expects reminders; they build them into their own process. Calm, factual follow-up signals that you're organized, not desperate.",
      },
      {
        q: "How do I tell a disorganized client from an avoidant one?",
        a: "Disorganized clients respond to the first or second reminder with an apology and a date. Avoidant ones go quiet across multiple channels. Response pattern, not lateness itself, is the tell.",
      },
      {
        q: "Should I stop working for a late-paying client?",
        a: "Pause new work when an invoice passes ~14 days overdue and your day-7 reminder got no response — say so plainly and politely. Resuming is easy; unpaid work stacking up is not.",
      },
    ],
    related: ["client-wont-pay-what-to-do", "stop-chasing-invoices", "late-payment-statistics-2026"],
  },

  "client-wont-pay-what-to-do": {
    slug: "client-wont-pay-what-to-do",
    title: "How to Handle a Client Who Won't Pay",
    metaTitle: "Client Won't Pay? The Freelancer's Escalation Playbook",
    metaDescription:
      "A client who won't pay an invoice needs a process, not panic. The complete escalation ladder: from firm email to final notice, collections, small claims, and knowing when to walk away.",
    keywords: [
      "client won't pay invoice",
      "how to handle non paying client",
      "freelancer client not paying",
      "debt collection freelancer",
      "final notice invoice",
    ],
    excerpt:
      "When reminders stop working, you need the escalation ladder: firm email, final notice, work pause, collections, small claims — and the judgment to know which rung to climb and when to walk away.",
    datePublished: "2026-05-28",
    readMinutes: 8,
    intro:
      "Every freelancer eventually meets the invoice that doesn't move. The mistake is treating it emotionally — either raging at the client or writing the money off too early. Non-payment is a process problem with a defined ladder. Climb it one rung at a time, and know when the last rung isn't worth it.",
    sections: [
      {
        heading: "Rung 1: The firm-but-warm email (day 7–10)",
        paragraphs: [
          "Drop the softeners. State facts: invoice number, amount, days overdue. Offer an out — 'If something's held this up on your side, tell me and we'll figure it out' — and a deadline: 'If I don't hear back by Friday, I'll need to pause current work.' Most stalled invoices move at this rung.",
        ],
      },
      {
        heading: "Rung 2: Pause the work (day 10–14)",
        paragraphs: [
          "If you have active work for this client, pause it — and say so in one calm sentence. 'I'm pausing the current sprint until invoice 1042 is settled.' This is the single most effective lever freelancers have; it converts your invoice from history into a blocker on something the client wants.",
        ],
      },
      {
        heading: "Rung 3: The final notice (day 14–21)",
        paragraphs: [
          "One page, three facts, one consequence: the invoice, the overdue period, and the specific next step — late fee per your terms, a collections agency, or small claims — with a date. Send it by email and, for larger amounts, by a channel that creates a record. Keep the tone flat; the formality is the message.",
        ],
      },
      {
        heading: "Rung 4: Collections or small claims",
        paragraphs: [
          "Collections agencies typically take 20–50% of recovered amounts and make sense for larger invoices where the client is solvent but unresponsive. Small claims court handles smaller amounts (limits vary by jurisdiction, commonly $2,500–$25,000) with filing fees under ~$100 and no lawyer required — bring the contract, the invoice, the delivered work, and your reminder trail.",
          "For many freelancers, the credible threat of small claims — stated in the final notice — settles the invoice before any filing. Keep every reminder; your cadence is your evidence.",
        ],
      },
      {
        heading: "Rung 5: Know when to walk away",
        paragraphs: [
          "If the client is insolvent, the amount is small, and the trail is cold — write it off. Chasing a $600 invoice for three months costs more than $600 of your time and attention. Fire the client, tighten your prevention (deposits, milestones), and move on.",
          "The real lesson of every won't-pay story is upstream: deposits, same-day invoicing, payment links, and automatic follow-up (GentleTap runs polite pre-due and overdue reminders from your Gmail, and stops when payment lands) keep nearly every invoice off this ladder entirely.",
        ],
      },
    ],
    faq: [
      {
        q: "Can a freelancer sue a client for non-payment?",
        a: "Yes — small claims court is designed for exactly this and typically doesn't require a lawyer. Bring the contract, invoices, proof of delivered work, and your communication trail. Check your local limit; it commonly ranges from $2,500 to $25,000.",
      },
      {
        q: "Do collections agencies work for freelancers?",
        a: "For solvent-but-avoidant clients and larger invoices, often yes — expect to give up 20–50% of what's recovered. For small amounts or insolvent clients, the economics rarely work.",
      },
      {
        q: "When should I send a final notice?",
        a: "Typically day 14–21 overdue, after at least two ignored reminders. It should name the invoice, state the consequence, and give one last short deadline — and then you must actually follow through.",
      },
      {
        q: "Should I ever accept partial payment?",
        a: "For a genuinely strained good client, a written installment plan is usually better than collections. For an avoidant one, partial payment only as part of a settlement you consider final — get any write-off in writing.",
      },
    ],
    related: ["why-clients-pay-late", "stop-chasing-invoices", "payment-terms-that-get-you-paid"],
  },

  "freelancer-cash-flow-management": {
    slug: "freelancer-cash-flow-management",
    title: "Cash Flow Management for Freelancers: Stop Living Invoice to Invoice",
    metaTitle: "Cash Flow Management for Freelancers — A Practical System",
    metaDescription:
      "A practical cash-flow system for freelancers: buffers, milestone billing, faster receivables, tax pots, and smoothing feast-or-famine income without a finance degree.",
    keywords: [
      "freelancer cash flow management",
      "freelance feast or famine",
      "irregular income budgeting",
      "freelancer financial buffer",
    ],
    excerpt:
      "Freelance income is lumpy by nature — but the stress doesn't have to be. A five-part system for smoothing irregular revenue: buffers, billing structure, receivables speed, and the accounts that make it automatic.",
    datePublished: "2026-05-15",
    readMinutes: 8,
    intro:
      "Feast-or-famine isn't a personality trait of freelancing — it's the default outcome of irregular revenue plus regular expenses. You can't fully control when clients buy, but you can control when money lands and how long it lasts. Five parts, in order of impact.",
    sections: [
      {
        heading: "1. Build the buffer before anything else",
        paragraphs: [
          "One month of expenses in a separate account transforms every decision you make — you stop taking bad-fit work out of panic, and a late invoice becomes an annoyance instead of a crisis. Build it slowly if needed: skim 10% off every payment until you're at one month, then keep going toward three.",
        ],
      },
      {
        heading: "2. Restructure billing toward the front",
        paragraphs: [
          "Deposits and milestones pull cash forward in the engagement. 50/25/25 on fixed projects and two-week billing cycles on retainers shrink the gap between doing work and being paid for it. The less you finance your clients' operations interest-free, the smoother your own cash flow runs.",
        ],
      },
      {
        heading: "3. Speed up receivables — the cheapest lever",
        paragraphs: [
          "Cash stuck in unpaid invoices is cash you earned but can't use. Same-day invoicing, payment links, and consistent follow-up routinely cut weeks off time-to-pay. This is the highest-ROI cash-flow move most freelancers ignore: your money already exists; collect it faster.",
          "Automation is what makes 'consistent' possible: GentleTap watches your QuickBooks or FreshBooks balances and sends polite follow-ups from your Gmail on a fixed cadence — the free Starter plan covers 5 collections a month.",
        ],
      },
      {
        heading: "4. Separate the money on arrival",
        paragraphs: [
          "Every payment that lands gets split the same day: a fixed percentage to a tax pot, a percentage to the buffer until it's full, the rest to operating. When the money is pre-assigned, a $9,000 month and a $3,000 month produce the same calm — you're managing allocations, not emotions.",
        ],
      },
      {
        heading: "5. Pay yourself a salary",
        paragraphs: [
          "Move a fixed amount to personal on a fixed day, whatever the month looked like. Business surpluses accumulate in the business account; personal spending stops tracking client payment timing. This single habit ends most feast-or-famine psychology even before the income itself smooths out.",
        ],
      },
    ],
    faq: [
      {
        q: "How much should a freelancer keep in a cash buffer?",
        a: "One month of expenses minimum, three months ideally. The buffer's job is to decouple your decisions from any single client's payment timing.",
      },
      {
        q: "How do I budget with irregular freelance income?",
        a: "Budget on your salary, not your revenue: pay yourself a fixed monthly amount from the business account, and let surpluses and shortfalls average out in the business buffer.",
      },
      {
        q: "What percentage should freelancers set aside for tax?",
        a: "Commonly 25–30% in the US, but your rate depends on income and jurisdiction — ask an accountant once, then automate the transfer every time a payment lands.",
      },
    ],
    related: ["late-payment-statistics-2026", "get-paid-faster-freelancer", "stop-chasing-invoices"],
  },

  "payment-terms-that-get-you-paid": {
    slug: "payment-terms-that-get-you-paid",
    title: "How to Set Payment Terms That Clients Respect",
    metaTitle: "Payment Terms That Get You Paid — Freelancer's Guide",
    metaDescription:
      "Which payment terms actually work for freelancers: deposits, net-7 vs net-30, late fees, milestone billing, and the exact wording to put in contracts and invoices.",
    keywords: [
      "payment terms for freelancers",
      "net 30 vs net 14",
      "late fee invoice wording",
      "milestone billing freelance",
      "invoice payment terms example",
    ],
    excerpt:
      "Payment terms aren't legal boilerplate — they're the rules of a game your clients will play exactly as written. Set them deliberately: deposits, short nets, milestones, and consequences that exist on paper before you need them.",
    datePublished: "2026-04-30",
    readMinutes: 7,
    intro:
      "Most freelancers inherit their payment terms from a template and never revisit them. But terms are strategy: they decide who finances whom. Written well, they prevent most late payments before they start — and give you standing when prevention fails.",
    sections: [
      {
        heading: "Start with a deposit — always",
        paragraphs: [
          "A 30–50% deposit for new clients is the single strongest term you can set. It filters out bad payers before you've done the work, funds the project as it runs, and leaves a final balance small enough to clear fast. Any client unwilling to pay a deposit has told you everything about how the final invoice will go.",
        ],
      },
      {
        heading: "Shorter nets beat longer ones",
        paragraphs: [
          "Net-7 and net-14 terms get paid sooner than net-30 — not because clients rush, but because the invoice stays fresh. With net-30, your invoice is a month old before anyone feels urgency, and 'a few days late' stretches to 45–60 days. Reserve long nets for enterprise clients whose AP cycles genuinely require them, and price accordingly.",
        ],
      },
      {
        heading: "Milestones for anything over a few thousand",
        paragraphs: [
          "On larger fixed-fee projects, 50/25/25 (start / midpoint / delivery) keeps you from financing months of a client's project. Attach each invoice to an objective milestone — a delivered artifact, an approved stage — so payment never waits on the whole project's completion.",
        ],
      },
      {
        heading: "Late fees: on paper, not in anger",
        paragraphs: [
          "A late fee only works if it's in the signed terms before the work starts — you can't invent one at day 20 overdue. A typical clause: 'Balances unpaid more than 14 days past due accrue 1.5% per month.' Whether you ever collect it matters less than having it: it converts your follow-up from a favor into a contractual reminder.",
        ],
      },
      {
        heading: "Put the follow-up policy in writing too",
        paragraphs: [
          "One underrated clause: 'Friendly payment reminders are sent before and after the due date; work pauses on accounts more than 14 days overdue.' When your reminder arrives, it's the system working as documented — not you being difficult. Tools like GentleTap then run that documented cadence automatically from your Gmail, stopping when QuickBooks or FreshBooks shows the balance paid.",
        ],
      },
    ],
    faq: [
      {
        q: "What payment terms should a freelancer use?",
        a: "A solid default: 30–50% deposit, net-7 to net-14 on balances, milestone billing for larger projects, a late-fee clause (~1.5%/month), and a written follow-up policy. Adjust net terms longer only for enterprise AP processes.",
      },
      {
        q: "Can I add a late fee after the invoice is already late?",
        a: "Not retroactively — it must be in the agreed terms beforehand. Many freelancers still use it as leverage: 'I'll waive the fee if payment arrives this week.'",
      },
      {
        q: "Are 'due on receipt' invoices effective?",
        a: "For small, one-off jobs with established clients, yes. For larger or corporate clients, 'due on receipt' is usually treated as net-7 anyway — a short explicit net term is clearer and more enforceable.",
      },
    ],
    related: ["stop-chasing-invoices", "get-paid-faster-freelancer", "client-wont-pay-what-to-do"],
  },

  "whatsapp-invoice-reminders": {
    slug: "whatsapp-invoice-reminders",
    title: "WhatsApp Invoice Reminders: The Channel That Actually Gets Read",
    metaTitle: "WhatsApp Invoice Reminders — The Channel Everyone Ignores",
    metaDescription:
      "Email open rates for invoice reminders keep falling. WhatsApp messages are read within minutes. How multi-channel invoice follow-up works, when to use it, and how GentleTap adds WhatsApp to your reminder sequence.",
    keywords: [
      "whatsapp invoice reminders",
      "whatsapp payment reminder",
      "multi-channel invoice follow up",
      "invoice reminder channels",
    ],
    excerpt:
      "Your reminder emails compete with 120 other messages a day. A WhatsApp nudge lands on the phone's home screen. Here's how multi-channel follow-up works — and the etiquette that keeps it friendly.",
    datePublished: "2026-07-20",
    readMinutes: 6,
    intro:
      "There's a quiet reason invoices go unpaid that has nothing to do with clients: your reminder email never got seen. Business inboxes process well over a hundred messages a day, and a polite nudge from a supplier is exactly the kind of email that sinks. Multi-channel follow-up fixes the visibility problem — and WhatsApp is the strongest second channel most freelancers never use.",
    sections: [
      {
        heading: "Why email-only follow-up leaks money",
        paragraphs: [
          "Invoice reminders fail in two ways: ignored (client saw it, postponed) and unseen (it never surfaced). The second category is bigger than most people assume — especially with clients who live in chat tools and treat email as an archive. You can't remind someone who never saw the reminder.",
        ],
      },
      {
        heading: "What WhatsApp changes",
        paragraphs: [
          "WhatsApp messages are typically read within minutes and land on the home screen, not in a promotions tab. For clients you've already messaged on WhatsApp during the project, a short payment nudge there feels like a natural continuation of the working relationship — not a collections letter.",
          "The etiquette matters: keep WhatsApp nudges short, warm, and infrequent — one per reminder step at most, always after (not instead of) the email with the invoice details and payment link. Used this way, clients consistently describe them as helpful rather than intrusive.",
        ],
      },
      {
        heading: "How a multi-channel sequence works in practice",
        paragraphs: [
          "A sensible pattern: email carries the facts (invoice number, amount, payment link); WhatsApp carries the nudge ('Hi Sam — just flagged invoice 1042 by email, link's in there if you want to knock it out this week'). The email is the record; the message is the tap on the shoulder.",
          "GentleTap automates exactly this on Pro+ and Team: each reminder step sends the AI-drafted email from your Gmail first, then a WhatsApp follow-up roughly three hours later on the early steps — stopping across both channels the moment the invoice balance clears in QuickBooks or FreshBooks.",
        ],
      },
      {
        heading: "When WhatsApp is (and isn't) appropriate",
        paragraphs: [
          "Use it with clients you already have a messaging relationship with — common for freelancers, agencies, and international clients where WhatsApp is the default business channel. Skip it for enterprise clients with formal AP processes, where email is the system of record and anything else would be odd.",
        ],
      },
    ],
    faq: [
      {
        q: "Is it professional to send invoice reminders on WhatsApp?",
        a: "With clients who already message you there, yes — short, warm nudges after the detailed email are widely read as helpful. For formal enterprise AP processes, stick to email.",
      },
      {
        q: "Does GentleTap send WhatsApp reminders automatically?",
        a: "Yes — on Pro+ and Team plans, GentleTap follows the email step with a WhatsApp message about three hours later on steps 1–3, and stops both channels when the balance hits zero.",
      },
      {
        q: "What should a WhatsApp payment reminder say?",
        a: "One or two sentences: greet, reference the invoice by number, and point to the email with the payment link. The facts live in the email; the message is just the nudge.",
      },
    ],
    related: ["stop-chasing-invoices", "get-paid-faster-freelancer", "why-clients-pay-late"],
  },
};

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS[slug as BlogPostSlug];
}

export function getAllBlogPosts(): BlogPost[] {
  return BLOG_POST_SLUGS.map((slug) => BLOG_POSTS[slug]);
}
