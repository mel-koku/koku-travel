import { Geist_Mono, Geist, Newsreader } from "next/font/google";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { WebVitals } from "@/components/WebVitals";
import { VariantProvider } from "@/lib/variant/VariantContext";
import { getSiteSettings } from "@/lib/sanity/contentService";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
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
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} min-h-[100dvh] bg-background font-sans text-foreground`}
      >
        <WebVitals />
        <LayoutWrapper siteSettings={siteSettings ?? undefined}>
          {children}
        </LayoutWrapper>
      </div>
    </VariantProvider>
  );
}
