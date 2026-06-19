import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GentleTap — Get paid. Keep the relationship.",
  description:
    "AI-powered payment reminders for freelancers. Connect QuickBooks, send follow-ups from your email, get paid without the awkward conversations. A tap on the shoulder — not a knock on the door.",
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "GentleTap — Get paid. Keep the relationship.",
    description:
      "AI-powered payment reminders for freelancers. Connect QuickBooks, send follow-ups from your email.",
    url: "https://gentletap.co",
    siteName: "GentleTap",
    images: [{ url: "/brand/icon-512.png", width: 512, height: 512, alt: "GentleTap" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "GentleTap",
    images: ["/brand/icon-512.png"],
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
        <AuthProvider>{children}</AuthProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
