import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";
import { SITE } from "@/lib/utils";
import "./globals.css";

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
  openGraph: {
    type: "website",
    url: SITE.url,
    title: `${SITE.name} — AI/ML & Full-Stack Developer`,
    description: SITE.tagline,
    siteName: SITE.name,
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} noise antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
