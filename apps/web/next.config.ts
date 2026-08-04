import type { NextConfig } from "next";
import path from "path";
import { SECURITY_HEADER_ENTRIES } from "./src/lib/security-headers";

const securityHeaders = SECURITY_HEADER_ENTRIES.map(({ key, value }) => ({
  key,
  value,
}));

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      // Audit: /compare and /alternatives cannibalize — one primary URL per competitor.
      {
        source: "/alternatives",
        destination: "/compare",
        permanent: true,
      },
      {
        source: "/alternatives/:slug",
        destination: "/compare/:slug",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Content-Type",
            value: "application/xml; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
