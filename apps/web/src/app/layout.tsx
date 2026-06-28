import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { AffiliateAuthProvider } from "@/lib/affiliate-auth";
import { AffiliateRefTracker } from "@/components/affiliate-ref-tracker";
import { CookieConsent } from "@/components/cookie-consent";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  INDEX_ROBOTS,
  SEO_KEYWORDS,
  SITE_URL,
} from "@/lib/seo";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | GentleTap",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [...SEO_KEYWORDS],
  applicationName: "GentleTap",
  authors: [{ name: "GentleTap", url: SITE_URL }],
  creator: "GentleTap",
  publisher: "GentleTap",
  robots: INDEX_ROBOTS,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: "GentleTap",
    locale: "en_US",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: DEFAULT_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <AffiliateAuthProvider>
            <AffiliateRefTracker />
            {children}
          </AffiliateAuthProvider>
        </AuthProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
