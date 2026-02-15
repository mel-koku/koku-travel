import { getPublishedExperiences } from "@/lib/experiences/experienceService";
import { getPagesContent } from "@/lib/sanity/contentService";
import { ExperiencesPageClient } from "@/components/features/experiences/ExperiencesPageClient";

export const metadata = {
  title: "Experiences | Koku Travel",
  description:
    "Discover hands-on workshops, cultural immersions, and unforgettable experiences across Japan. From traditional crafts to culinary adventures.",
  openGraph: {
    title: "Experiences | Koku Travel",
    description:
      "Discover hands-on workshops, cultural immersions, and unforgettable experiences across Japan. From traditional crafts to culinary adventures.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function ExperiencesPage() {
  const [experiences, content] = await Promise.all([
    getPublishedExperiences(),
    getPagesContent(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <ExperiencesPageClient experiences={experiences} content={content ?? undefined} />
    </div>
  );
}
