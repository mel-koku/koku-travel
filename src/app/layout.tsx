import type { Metadata, Viewport } from "next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { WebVitals } from "@/components/WebVitals";
import CookieBanner from "@/components/CookieBanner";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yukujapan.com";

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
        <GoogleAnalytics />
        <WebVitals />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
