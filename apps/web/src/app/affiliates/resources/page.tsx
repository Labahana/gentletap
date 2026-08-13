import Link from "next/link";

import { CopyBlock } from "@/components/copy-block";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  AFFILIATE_COMMISSION_MONTHS,
  AFFILIATE_FIRST_MONTH_RATE,
  AFFILIATE_REFERRAL_DISCOUNT_MONTHS,
  AFFILIATE_REFERRAL_DISCOUNT_PERCENT,
} from "@/lib/affiliate-program";
import { LEGAL } from "@/lib/legal";

const FIRST_MONTH_PERCENT = Math.round(AFFILIATE_FIRST_MONTH_RATE * 100);

const EMAIL_TEMPLATES = [
  {
    title: "Email 1 — Promo: " + "\u201C" + "Stop chasing invoices" + "\u201D",
    body: `Subject: The polite way to get paid on time (without the awkward emails)

Hey [first name],

Quick question: how much time did you spend last month chasing late invoices?

Most freelancers I talk to lose 3–5 hours a month writing "just checking in" emails — and hate every minute of it.

I've been using GentleTap. It connects to QuickBooks, watches your unpaid invoices, and sends polite follow-up emails that sound like you wrote them. When the client pays, it stops automatically.

No more awkward "friendly reminder" drafts sitting in your outbox.

Try it free here (no card needed): ${LEGAL.websiteDisplay}/signup?ref=YOUR_CODE

Through my link you get ${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off your first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months if you upgrade.

[Your name]

P.S. I earn a commission if you subscribe through my link — I only recommend it because it solved this exact problem for me.`,
  },
  {
    title: "Email 2 — Discount-forward",
    body: `Subject: ${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off the invoice follow-up tool I use

Hey [first name],

If you invoice through QuickBooks, this is worth 2 minutes.

GentleTap automates the "your invoice is overdue" emails — polite, on schedule, and in your tone. It syncs with QuickBooks, so it knows exactly which invoices are unpaid and stops the moment you're paid.

My readers get ${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off the first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months:
${LEGAL.websiteDisplay}/signup?ref=YOUR_CODE

There's a free tier too, so you can test it on real invoices before paying anything.

[Your name]

(Disclosure: affiliate link — I earn a commission at no cost to you.)`,
  },
  {
    title: "Email 3 — Quick tip → tool",
    body: `Subject: The 3-7-14 rule for overdue invoices

Hey [first name],

Here's a follow-up cadence that works without burning client relationships:

• Day 3 past due: gentle nudge ("just flagging in case it slipped through")
• Day 7: direct ask ("could you confirm payment date?")
• Day 14: firm + pause work ("I'll pause deliverables until we're square")

The problem: remembering to actually SEND these on time, per client, per invoice.

That's what I use GentleTap for — it runs this exact sequence automatically on my QuickBooks invoices, in my own tone, and stops when payment lands.

Free tier: ${LEGAL.websiteDisplay}/signup?ref=YOUR_CODE (${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off your first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months on paid plans with my link)

[Your name]

Affiliate disclosure: I earn a commission if you subscribe.`,
  },
  {
    title: "Email 4 — Story: the late-paying client",
    body: `Subject: My client paid 47 days late. I never emailed them once.

Hey [first name],

Last year I had a client — great people, terrible payers. Every invoice went 30, 40, once 47 days late.

The worst part wasn't the cash flow. It was the mental load of composing "polite but firm" emails at 11pm.

I finally automated it. GentleTap connects to QuickBooks and sends the follow-ups for me — gentle nudge, firmer ask, final notice — written in my tone. The 47-day client? Their last invoice was paid on day 6.

If late invoices are eating your evenings, try it free:
${LEGAL.websiteDisplay}/signup?ref=YOUR_CODE

My link gets you ${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off your first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months if you upgrade.

[Your name]

P.S. That's an affiliate link — I earn a commission, and I genuinely use the product.`,
  },
  {
    title: "Email 5 — Story: Sunday dread",
    body: `Subject: I got my Sunday nights back

Hey [first name],

Every freelancer knows the Sunday-night ritual: opening QuickBooks, sorting by overdue, and drafting awkward reminder emails instead of relaxing.

I counted once: 90 minutes a week. 78 hours a year. Chasing money I'd already earned.

Now an automated sequence does it. Polite on day 0, firmer on day 7, final on day 14 — and it stops the second a client pays. It sounds like me because it's trained on my own emails.

It's called GentleTap. Free to try: ${LEGAL.websiteDisplay}/signup?ref=YOUR_CODE

(${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off your first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months with my link. I earn a commission if you subscribe.)

Here's to quieter Sundays,
[Your name]`,
  },
] as const;

const VIDEO_SCRIPTS = [
  {
    title: "Script 1 — Product walkthrough (5–7 min)",
    body: `HOOK (0:00–0:20)
"If you freelance and use QuickBooks, you probably have at least one unpaid invoice right now. This tool chases it for you — politely. Let me show you."

PROBLEM (0:20–1:00)
Show a QuickBooks invoice list sorted by overdue. Talk about the awkwardness of reminder emails and the time they take.

DEMO (1:00–4:30)
1. Sign up (free tier, no card) — show it takes a minute.
2. Connect QuickBooks — one OAuth click.
3. Show the dashboard: invoices auto-imported, green/yellow/red status.
4. Show a generated reminder email — point out it sounds human, not robotic.
5. Show the sequence schedule (Day 0/3/7/14/21) and how it stops on payment.

OFFER (4:30–5:00)
"If you want to try it, my link gets you ${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off your first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months — there's a free tier too, so test it on real invoices first. Link in the description."

DISCLOSURE (verbal, required)
"The link is an affiliate link, so I earn a commission if you subscribe. I reached out to them because I actually use this."

CTA (5:00–end)
"Comment if you want my exact reminder email templates — I'll make that video next."`,
  },
  {
    title: "Script 2 — Story: " + "\u201C" + "How I stopped chasing invoices" + "\u201D" + " (4–6 min)",
    body: `HOOK (0:00–0:15)
"A year ago I was spending every Sunday night begging clients to pay me. Here's what changed."

STORY (0:15–2:30)
Tell your real story. Be specific: how many invoices, how late, what it cost you (time, stress, awkwardness). The more honest the numbers, the better this converts.

TURNING POINT (2:30–3:00)
"I didn't hire anyone. I automated the follow-ups." Introduce GentleTap as the tool you found/built the habit around.

HOW IT WORKS (3:00–4:30)
Quick screen recording: QuickBooks connected → unpaid invoices appear → reminder sequence runs → payment detected → sequence stops. Emphasize the tone controls (gentle → firm).

OFFER + DISCLOSURE (4:30–end)
"Free tier, no card. My link saves you ${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% on your first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months if you upgrade — affiliate link, I earn a commission. If late invoices are your Sunday-night problem too, it's in the description."`,
  },
  {
    title: "Script 3 — Comparison: QuickBooks reminders vs GentleTap (6–8 min)",
    body: `HOOK (0:00–0:20)
"QuickBooks has built-in payment reminders. So why are your invoices still late? Let's compare it to a dedicated tool."

SETUP (0:20–1:00)
Explain the test: same overdue invoices, both approaches.

QUICKBOOKS REMINDERS (1:00–3:00)
Show QBO's native reminder feature honestly: it exists, it's manual-ish, one flat template, no escalation logic, no tone control, easy to forget to send.

GENTLETAP (3:00–5:30)
Same invoices in GentleTap: automatic sequence, escalating tone, sends from YOUR Gmail so clients reply to you, stops on payment, dashboard of who's been nudged when.

VERDICT (5:30–6:30)
Be fair: "If you send 2 invoices a month, QuickBooks reminders are fine. If you chase payments monthly, GentleTap pays for itself in recovered time."

OFFER + DISCLOSURE (6:30–end)
"Free tier, ${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off your first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months with my link — affiliate link, I earn a commission. Both tools' links are below if you want to run your own test."`,
  },
] as const;

const SOCIAL_POSTS = [
  "Freelancers: the average overdue invoice gets paid 6 days faster when follow-ups are automatic. GentleTap does it from your own Gmail, in your tone. Free tier: gentletap.co/signup?ref=YOUR_CODE (affiliate link)",
  "Nobody teaches you the worst part of freelancing: asking clients for money you already earned. I automated it. Here's how:",
  "Your QuickBooks invoices aren't going to chase themselves. (Mine chase themselves.)",
  "Polite payment reminder sequence that works: Day 0 friendly → Day 3 nudge → Day 7 direct → Day 14 firm. Or let GentleTap run it while you sleep:",
  "Unpopular opinion: 'just checking in on this invoice' emails are a tax on people-pleasers. Automate them.",
  "The 3 metrics that fixed my cash flow: days-to-pay, # of reminders sent, % collected by day 14. This dashboard tracks all three:",
  "I stopped writing 'friendly reminder' emails at 11pm. A sequence does it now — and clients say the emails sound exactly like me. Because they were trained on mine.",
  "For my fellow QuickBooks freelancers: connect it once, and every overdue invoice gets a polite, escalating follow-up. Stops when they pay. Free tier:",
  "Client paid on day 6. Used to be day 34. The only change: automated follow-ups that go out on schedule whether I remember or not.",
  "If your audience asks how you get paid on time: 50% upfront, net-7 terms, and automated reminders for everything else. My setup:",
] as const;

const DISCLOSURE_LINES = [
  "I earn a commission if you sign up through my link — at no extra cost to you.",
  "Affiliate link: I earn a commission if you subscribe. I use GentleTap for my own invoices.",
  "This video/post is not sponsored, but the link is an affiliate link — I earn 50% of your first month and a share of renewals.",
  "Full transparency: I'm a GentleTap affiliate. I recommend it because it solved my late-invoice problem; I earn a commission if you subscribe.",
] as const;

const CLIENT_EXPLAINER = `Hi [client first name],

You asked how to keep invoices from going overdue — here's the tool I recommend to my freelance clients.

It's called GentleTap. It connects to your QuickBooks account and automatically sends polite payment reminder emails when an invoice goes past due. The emails sound like you wrote them, they come from your own Gmail, and they stop the moment the client pays.

What it does:
• Watches your unpaid QuickBooks invoices automatically
• Sends a gentle, escalating reminder sequence (you approve the wording)
• Stops following up the moment payment arrives
• Shows a simple dashboard of who's been reminded and when

Why I recommend it: my clients who automate follow-ups get paid measurably faster, and it removes the awkward "chasing money" emails entirely.

There's a free tier (no card required), and this link includes ${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off your first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months if you upgrade:
${LEGAL.websiteDisplay}/signup?ref=YOUR_CODE

Happy to walk you through the setup on our next call.

[Your name]
(Disclosure: I'm a GentleTap partner and earn a commission if you subscribe.)`;

const CASE_STUDY_TEMPLATE = `Title: How [name/brand] cut average days-to-pay from [X] to [Y]

1. WHO: One line — who you are, what you freelance in, rough invoice volume.
2. BEFORE: Your old follow-up process. Be specific: hours spent, average days-to-pay, worst late invoice.
3. THE CHANGE: When you turned GentleTap on, which sequence you use, which tone.
4. AFTER (numbers): days-to-pay now, time saved per week, % invoices paid by day 14.
5. ONE QUOTE: The client reaction that surprised you ("thanks for the reminder, it slipped through").
6. YOUR TAKE: Would you recommend it, and to whom?
Include your referral link + disclosure line at the end.`;

const AFFILIATE_FAQ_ONE_PAGER = [
  ["Is there a free tier my audience can try?", "Yes — Starter is free with no credit card. They can run it on real invoices before paying."],
  ["What do my followers get for using my link?", `${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off their first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months on any paid plan, applied automatically at checkout.`],
  ["What do I earn?", `${FIRST_MONTH_PERCENT}% of each referral's first paid month, then 30% of every payment for ${AFFILIATE_COMMISSION_MONTHS} months — rising to 35%/40% automatically when you refer $500+/$2,000+ in a month.`],
  ["When do I get paid?", `Monthly, net 15, once your balance passes $20. PayPal, Wise, or bank transfer.`],
  ["How long does tracking last?", "60 days from the first click on your link."],
  ["Can I run paid ads?", "Yes, except bidding on 'GentleTap' branded keywords. See the program terms."],
  ["Do I have to disclose?", "Always. Use one of the disclosure lines on this page."],
] as const;

const BRAND_ASSETS = [
  { label: "Full logo (SVG)", href: "/brand/logo-full.svg" },
  { label: "Logo mark (SVG)", href: "/brand/logo-mark.svg" },
  { label: "Logo mark, transparent (SVG)", href: "/brand/logo-mark-transparent.svg" },
  { label: "App icon 512px (PNG)", href: "/brand/icon-512.png" },
] as const;

export default function AffiliateResourcesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-4xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Affiliate resource kit
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Everything you need to promote GentleTap this week
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Ready-to-use email templates, video scripts, social posts, disclosure lines, and brand
            assets. Replace{" "}
            <code className="rounded bg-card px-1.5 py-0.5 text-sm">YOUR_CODE</code> with the
            referral code from your{" "}
            <Link href="/affiliates/dashboard" className="text-accent hover:underline">
              dashboard
            </Link>
            . Not a partner yet?{" "}
            <Link href="/affiliates#apply" className="text-accent hover:underline">
              Apply here
            </Link>
            .
          </p>
        </article>

        <section className="border-y border-border bg-card/30 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Newsletter email templates</h2>
            <p className="mt-2 text-sm text-muted">
              Three promos and two story-driven emails. Adapt the voice; keep the disclosure.
            </p>
            <div className="mt-8 space-y-6">
              {EMAIL_TEMPLATES.map((t) => (
                <CopyBlock key={t.title} title={t.title} body={t.body} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">YouTube video scripts</h2>
          <p className="mt-2 text-sm text-muted">
            Structured outlines with the offer and disclosure built in — record them your way.
          </p>
          <div className="mt-8 space-y-6">
            {VIDEO_SCRIPTS.map((s) => (
              <CopyBlock key={s.title} title={s.title} body={s.body} />
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/30 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Social posts</h2>
            <p className="mt-2 text-sm text-muted">
              Ten hooks for X/Twitter, LinkedIn, and Threads. Append your link + a disclosure line.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {SOCIAL_POSTS.map((post, i) => (
                <CopyBlock key={i} title={`Post ${i + 1}`} body={post} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">Disclosure lines (use one, always)</h2>
          <p className="mt-2 text-sm text-muted">
            FTC and platform rules require clear disclosure. Any of these satisfies it.
          </p>
          <div className="mt-8 space-y-4">
            {DISCLOSURE_LINES.map((line, i) => (
              <CopyBlock key={i} title={`Disclosure ${i + 1}`} body={line} />
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/30 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Brand assets</h2>
            <p className="mt-2 text-sm text-muted">
              Use these to promote GentleTap under the affiliate terms — don&apos;t modify the logo
              or imply you&apos;re an employee.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {BRAND_ASSETS.map((asset) => (
                <li key={asset.href}>
                  <a href={asset.href} download className="card flex items-center justify-between py-4 hover:border-accent">
                    <span className="text-sm font-medium">{asset.label}</span>
                    <span className="text-xs text-accent">Download</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">
              Need product screenshots? Take them from your own free-tier account — authentic
              screenshots convert better than polished marketing shots anyway.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">For accountants &amp; bookkeepers: client explainer</h2>
          <p className="mt-2 text-sm text-muted">
            A one-page email you can forward to freelance clients as-is. It positions you as the
            expert who solved their late-payment problem.
          </p>
          <div className="mt-8">
            <CopyBlock title="Client explainer (forward-ready)" body={CLIENT_EXPLAINER} />
          </div>
        </section>

        <section className="border-y border-border bg-card/30 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Case-study template</h2>
            <p className="mt-2 text-sm text-muted">
              Fill in your own numbers after 30 days on the program — case studies convert better
              than any promo.
            </p>
            <div className="mt-8">
              <CopyBlock title="Case-study outline" body={CASE_STUDY_TEMPLATE} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">Affiliate FAQ one-pager</h2>
          <dl className="mt-8 space-y-6">
            {AFFILIATE_FAQ_ONE_PAGER.map(([q, a]) => (
              <div key={q}>
                <dt className="font-semibold text-foreground">{q}</dt>
                <dd className="mt-2 text-muted">{a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-sm text-muted">
            Something missing? Email{" "}
            <a href={`mailto:${LEGAL.supportEmail}`} className="text-accent hover:underline">
              {LEGAL.supportEmail}
            </a>{" "}
            — founder answers affiliate questions personally.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
