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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
