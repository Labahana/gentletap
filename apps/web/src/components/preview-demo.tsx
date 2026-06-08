"use client";

import { useEffect, useState } from "react";
import { api, type DecideResult } from "@/lib/api";

export function PreviewDemo() {
  const [preview, setPreview] = useState<DecideResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .previewIntelligence()
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse text-sm text-muted">
        Drafting a gentle reminder for Sarah…
      </div>
    );
  }

  if (!preview?.message) {
    return (
      <div className="card text-sm text-muted">
        Connect the API to see a live AI preview.
      </div>
    );
  }

  return (
    <div className="card space-y-3 text-left">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>To: Sarah · Invoice #1234 · $4,200</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">
          {preview.tone ?? "warm"}
        </span>
      </div>
      <p className="text-sm font-medium">{preview.message.subject}</p>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
        {preview.message.body.split("---")[0].trim()}
      </pre>
    </div>
  );
}
