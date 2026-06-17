"use client";

const SAMPLE = {
  tone: "warm",
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
    <div className="card space-y-3 text-left">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Example · Sarah · Invoice #1234 · $4,200 · 5 days overdue</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 capitalize text-accent">
          {SAMPLE.tone}
        </span>
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Email preview</p>
      <p className="text-sm font-medium">{SAMPLE.message.subject}</p>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
        {SAMPLE.message.body}
      </pre>
    </div>
  );
}
