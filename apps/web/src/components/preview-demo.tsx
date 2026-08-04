"use client";

const SAMPLE = {
  tone: "warm",
  from: "you@gmail.com",
  message: {
    subject: "Quick note on invoice #1234",
    body: `Hi Sarah,

Hope you're having a great week! Just a gentle check-in that invoice #1234 for $4,200 was due last Tuesday (5 days ago).

I'm sure it just slipped through — wanted to make sure it's on your radar. Happy to answer any questions.

Best regards`,
  },
};

export function PreviewDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background text-left shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-card/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-2 truncate text-xs text-muted">Sent from {SAMPLE.from}</span>
      </div>
      <div className="space-y-3 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>Sarah · Invoice #1234 · $4,200 · 5 days overdue</span>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 capitalize text-accent">
            {SAMPLE.tone} · step 1
          </span>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Subject</p>
        <p className="text-sm font-medium">{SAMPLE.message.subject}</p>
        <pre className="whitespace-pre-wrap border-t border-border pt-4 font-sans text-sm leading-relaxed text-foreground/90">
          {SAMPLE.message.body}
        </pre>
        <p className="border-t border-border pt-3 text-xs text-muted">
          Next: day-7 follow-up scheduled · stops automatically when balance hits $0
        </p>
      </div>
    </div>
  );
}
