import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";
import { SITE as CANONICAL } from "@/lib/site";
import { SITE } from "@/lib/utils";
import "./globals.css";

/**
 * Two `SITE` objects, deliberately:
 *
 *   - `SITE` from `@/lib/utils` is the flat, *person*-centric view the portfolio
 *     sections use — `name` there is "Aman Krishna". That is the right value for
 *     a page title, `author` and `creator`.
 *   - `CANONICAL` from `@/lib/site` is the *site* identity — `name` is
 *     "AmanKrishna.in". That is the right value for `og:site_name`, which names
 *     the publication rather than the author. It used to read the person view, so
 *     shares announced a site called "Aman Krishna" that no domain matches.
 *
 * `alternates` here carries only the feed link. A `canonical` in the root layout
 * would be inherited by every page that does not set its own, so each page
 * declares its own canonical instead.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — AI/ML & Full-Stack Developer`,
    template: `%s — ${SITE.name}`,
  },
  description: `${SITE.name} is a ${SITE.role} building AI-powered products and modern web experiences with Next.js, TypeScript and Supabase.`,
  keywords: [
    "Aman Krishna",
    "portfolio",
    "AI",
    "Machine Learning",
    "Full Stack Developer",
    "Next.js",
    "React",
    "TypeScript",
  ],
  authors: [{ name: SITE.name, url: SITE.github }],
  creator: SITE.name,
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: `${CANONICAL.blog.title} — ${CANONICAL.name}` },
      ],
    },
  },
  openGraph: {
    type: "website",
    url: SITE.url,
    title: `${SITE.name} — AI/ML & Full-Stack Developer`,
    description: SITE.tagline,
    // The publication, not the person — see the note at the top of this file.
    siteName: CANONICAL.name,
    locale: CANONICAL.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — AI/ML & Full-Stack Developer`,
    description: SITE.tagline,
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={CANONICAL.lang} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} noise antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
