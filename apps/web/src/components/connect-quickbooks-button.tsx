"use client";

/**
 * Intuit-approved Connect to QuickBooks button (green C2QB).
 * Asset: https://developer.intuit.com/app/developer/qbo/docs/go-live/naming-and-logo-guidelines
 */
const C2QB_SRC =
  "https://static.developer.intuit.com/images/C2QB_green_btn_med_default.svg";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  size?: "sm" | "md";
};

export function ConnectQuickBooksButton({ onClick, disabled, busy, size = "md" }: Props) {
  const height = size === "sm" ? 32 : 40;

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
      />
    </button>
  );
}
