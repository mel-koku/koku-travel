import type { Metadata } from "next";
import { ExperiencesComingSoon } from "@/components/features/experiences/ExperiencesComingSoon";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Experiences | Yuku Japan",
  description:
    "Curated Japan experiences coming soon. Explore our guides and places in the meantime.",
  alternates: { canonical: "/experiences" },
  robots: { index: false, follow: true },
};

export default async function ExperiencesPage() {
  const content = await getPagesContent();
  return <ExperiencesComingSoon variant="a" content={content ?? undefined} />;
}
