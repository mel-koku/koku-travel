import type { Metadata } from "next";
import { Geist_Mono, Cormorant, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SharedProviders } from "@/components/SharedProviders";
import "./trip/[id]/print.css";

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

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PrintLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${plusJakarta.variable} ${geistMono.variable} ${cormorant.variable} font-sans text-foreground`}
    >
      <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} forcedTheme="light">
        <SharedProviders>{children}</SharedProviders>
      </ThemeProvider>
    </div>
  );
}
