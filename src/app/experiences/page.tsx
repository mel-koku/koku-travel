import { getPublishedExperiences } from "@/lib/experiences/experienceService";
import { ExperiencesPageClient } from "@/components/features/experiences/ExperiencesPageClient";

export const metadata = {
  title: "Experiences | Koku Travel",
  description:
    "Discover hands-on workshops, cultural immersions, and unforgettable experiences across Japan. From traditional crafts to culinary adventures.",
};

export const revalidate = 3600;

export default async function ExperiencesPage() {
  const experiences = await getPublishedExperiences();

  return (
    <div className="min-h-screen bg-background">
      <ExperiencesPageClient experiences={experiences} />
    </div>
  );
}
