import type { Metadata } from "next";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Privacy | Yuku Japan",
  description:
    "Privacy policy for Yuku Japan. We collect only what we need to plan your trip. No tracking, no ads, no selling your data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy | Yuku Japan",
    description:
      "Privacy policy for Yuku Japan. We collect only what we need to plan your trip.",
    url: "/privacy",
    siteName: "Yuku Japan",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy | Yuku Japan",
    description:
      "Privacy policy for Yuku Japan. We collect only what we need to plan your trip.",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-background px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-6")}>Privacy</h1>
        <p className="text-foreground-secondary leading-relaxed">
          We collect only what we need to plan your trip. No tracking, no ads, no selling your data.
        </p>
      </div>
    </main>
  );
}
