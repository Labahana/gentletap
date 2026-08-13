"use client";

import { useState } from "react";

export function CopyBlock({ title, body }: { title: string; body: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <button
          type="button"
          className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
          onClick={() => {
            void navigator.clipboard.writeText(body);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{body}</p>
    </div>
  );
}
