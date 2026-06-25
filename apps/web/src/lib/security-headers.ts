/** Shared HTTP security headers for Next.js and documentation. */

const isProd = process.env.NODE_ENV === "production";

/**
 * CSP tuned for Next.js (inline hydration scripts) + same-origin API proxy.
 * Paddle.js overlay checkout loads scripts, an iframe, and XHRs from *.paddle.com
 * (and *.paddleedge.com for the sandbox/profiler). The hosted-URL fallback uses
 * top-level navigation and needs no CSP entry.
 */
const PADDLE_HOSTS = "https://*.paddle.com https://*.paddleedge.com";

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${PADDLE_HOSTS}`,
  `style-src 'self' 'unsafe-inline' ${PADDLE_HOSTS}`,
  `img-src 'self' data: blob: ${PADDLE_HOSTS}`,
  "font-src 'self' data:",
  `connect-src 'self' ${PADDLE_HOSTS}`,
  `frame-src ${PADDLE_HOSTS}`,
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
