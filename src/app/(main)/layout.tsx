import { Geist_Mono, DM_Sans, Playfair_Display } from "next/font/google";
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

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
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
        className={`${dmSans.variable} ${geistMono.variable} ${playfairDisplay.variable} min-h-[100dvh] bg-background font-sans text-foreground`}
      >
        <WebVitals />
        <LayoutWrapper siteSettings={siteSettings ?? undefined}>
          {children}
        </LayoutWrapper>
      </div>
    </VariantProvider>
  );
}
