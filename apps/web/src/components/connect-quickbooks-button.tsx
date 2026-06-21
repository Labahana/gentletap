"use client";

import { useState } from "react";

/** Local C2QB asset — Intuit CDN is blocked in some production environments. */
const C2QB_SRC = "/brand/c2qb-green.svg";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  size?: "sm" | "md";
};

export function ConnectQuickBooksButton({ onClick, disabled, busy, size = "md" }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const height = size === "sm" ? 32 : 36;

  if (imgFailed) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        className="inline-flex items-center justify-center rounded bg-[#2CA01C] px-5 font-semibold text-white transition hover:bg-[#248517] disabled:opacity-60"
        style={{ height, minWidth: 200, fontSize: size === "sm" ? 13 : 14 }}
        aria-label="Connect to QuickBooks"
      >
        {busy ? "Connecting…" : "Connect to QuickBooks"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="inline-flex disabled:opacity-60"
      aria-label="Connect to QuickBooks"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={C2QB_SRC}
        alt="Connect to QuickBooks"
        height={height}
        style={{ height, width: "auto" }}
        onError={() => setImgFailed(true)}
      />
    </button>
  );
}
