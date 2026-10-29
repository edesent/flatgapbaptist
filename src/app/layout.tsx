import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import ChatWidget from "@/components/ChatWidget";
import Reveal from "@/components/Reveal";
import { EditGate } from "@/edit/EditGate";
import { church, isDemo, pastor, siteUrl } from "@/lib/site";
import "./globals.css";

// Dated things (the next service, events that expire) switch over on their own; re-render hourly.
export const revalidate = 3600;

// Self-hosted (next/font/google can fail the build on Vercel). Fetch more with scripts/get-font.sh.
const slab = localFont({ src: "../fonts/alfa-slab-one-400.woff2", variable: "--font-slab", display: "swap" });
const text = localFont({
  src: [
    { path: "../fonts/source-serif-4-200-900.woff2", weight: "200 900", style: "normal" },
    { path: "../fonts/source-serif-4-200-900-italic.woff2", weight: "200 900", style: "italic" },
  ],
  variable: "--font-text",
  display: "swap",
});
const franklin = localFont({
  src: "../fonts/libre-franklin-100-900.woff2",
  weight: "100 900",
  variable: "--font-franklin",
  display: "swap",
});

const description = `${church.name} is a small, old-fashioned Baptist church at ${church.streetNumber} ${church.street} in ${church.city}, ${church.county}, ${church.state}. ${pastor.title} ${pastor.name}. Sunday School, morning worship, and Wednesday prayer meeting.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${church.name} · ${church.city}, ${church.stateCode}`,
    template: `%s · ${church.short}`,
  },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: church.name,
    title: church.name,
    description,
  },
  twitter: { card: "summary" },
  robots: isDemo ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#f5efe1",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Church",
  name: church.name,
  url: siteUrl,
  description,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${church.streetNumber} ${church.street}`.trim(),
    addressLocality: church.city,
    addressRegion: church.stateCode,
    postalCode: church.zip,
    addressCountry: "US",
  },
  geo: { "@type": "GeoCoordinates", latitude: 37.9346, longitude: -82.8863 },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${slab.variable} ${text.variable} ${franklin.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <main>{children}</main>
        <Reveal />
        <EditGate />
        <ChatWidget />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
