import type { Metadata, Viewport } from "next";
import Script from "next/script";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { WebVitals } from "@/components/WebVitals";
import CookieBanner from "@/components/CookieBanner";
import { serializeJsonLd } from "@/lib/seo/jsonLd";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://yukujapan.com").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Yuku Japan - Discover Japan with Local Experts",
  description:
    "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
  openGraph: {
    title: "Yuku Japan - Discover Japan with Local Experts",
    description:
      "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
    url: BASE_URL,
    siteName: "Yuku Japan",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Yuku Japan - Discover Japan with Local Experts",
    description:
      "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Yuku Japan",
  url: BASE_URL,
  logo: `${BASE_URL}/icon.png`,
  description:
    "Curated travel guides, itineraries, and inspiration for planning trips to Japan, built with local experts.",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Yuku Japan",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/places?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://mbjcxrfuuczlauavashs.supabase.co" />
        <link rel="preconnect" href="https://cdn.sanity.io" />
      </head>
      <body className="min-h-[100dvh] antialiased">
        <Script
          id="ld-organization"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {serializeJsonLd(organizationJsonLd)}
        </Script>
        <Script
          id="ld-website"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {serializeJsonLd(websiteJsonLd)}
        </Script>
        <GoogleAnalytics />
        <WebVitals />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
