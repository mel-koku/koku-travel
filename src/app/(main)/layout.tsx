import { Geist_Mono, DM_Sans, Instrument_Serif } from "next/font/google";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { WebVitals } from "@/components/WebVitals";
import { VariantProvider } from "@/lib/variant/VariantContext";
import { getSiteSettings } from "@/lib/sanity/contentService";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export default async function VariantALayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();

  return (
    <VariantProvider variant="a">
      <div
        data-variant="a"
        className={`${dmSans.variable} ${geistMono.variable} ${instrumentSerif.variable} min-h-screen bg-background font-sans text-foreground`}
      >
        <WebVitals />
        <LayoutWrapper siteSettings={siteSettings ?? undefined}>
          {children}
        </LayoutWrapper>
      </div>
    </VariantProvider>
  );
}
