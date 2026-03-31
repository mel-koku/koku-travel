import { Geist_Mono, Cormorant, Plus_Jakarta_Sans } from "next/font/google";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { WebVitals } from "@/components/WebVitals";
import { getSiteSettings } from "@/lib/sanity/contentService";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant({
  variable: "--font-cormorant",
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
    <div
      className={`${plusJakarta.variable} ${geistMono.variable} ${cormorant.variable} min-h-[100dvh] bg-background font-sans text-foreground`}
    >
      <WebVitals />
      <LayoutWrapper siteSettings={siteSettings ?? undefined}>
        {children}
      </LayoutWrapper>
    </div>
  );
}
