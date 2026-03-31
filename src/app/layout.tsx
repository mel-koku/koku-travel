import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kokutravel.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Koku Travel - Discover Japan with Local Experts",
  description:
    "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
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
          src="https://www.googletagmanager.com/gtag/js?id=G-XE8JEJN333"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XE8JEJN333');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
