import type { Metadata } from "next";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "About | Yuku Japan",
  description:
    "Yuku is a Japan trip planner for curious travelers. Local knowledge plus smart planning, built to help you experience Japan beyond the guidebook.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-[100dvh] bg-background px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-6")}>About Yuku</h1>
        <p className="text-foreground-secondary leading-relaxed">
          Yuku is a Japan trip planning tool built for curious travelers. We combine local knowledge with smart planning to help you experience Japan beyond the guidebook.
        </p>
      </div>
    </main>
  );
}
