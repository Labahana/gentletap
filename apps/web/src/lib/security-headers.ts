/** Shared HTTP security headers for Next.js and documentation. */

const isProd = process.env.NODE_ENV === "production";

/**
 * CSP tuned for Next.js (inline hydration scripts) + same-origin API proxy.
 * OAuth/Paddle checkout use top-level navigation, not connect-src.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

export const SECURITY_HEADER_ENTRIES: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Legacy browsers; modern guidance prefers CSP. Kept for scanner compliance.
  { key: "X-XSS-Protection", value: "1; mode=block" },
];
