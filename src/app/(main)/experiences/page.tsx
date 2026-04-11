import { ExperiencesComingSoon } from "@/components/features/experiences/ExperiencesComingSoon";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata = {
  title: "Experiences | Yuku Japan",
  description:
    "Curated Japan experiences coming soon. Explore our guides and places in the meantime.",
  robots: { index: false },
};

export default async function ExperiencesPage() {
  const content = await getPagesContent();
  return <ExperiencesComingSoon variant="a" content={content ?? undefined} />;
}
