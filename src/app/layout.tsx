import type { Metadata } from "next";
import { Geist_Mono, DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { WebVitals } from "@/components/WebVitals";
import { getSiteSettings } from "@/lib/sanity/contentService";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Koku Travel - Discover Japan with Local Experts",
  description:
    "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${geistMono.variable} ${instrumentSerif.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <WebVitals />
        <LayoutWrapper siteSettings={siteSettings ?? undefined}>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
