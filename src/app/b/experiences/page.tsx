import { getPublishedExperiences } from "@/lib/experiences/experienceService";
import { getPagesContent } from "@/lib/sanity/contentService";
import { ExperiencesPageClientB } from "@/components-b/features/experiences/ExperiencesPageClientB";

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

export default async function ExperiencesPageB() {
  const [experiences, content] = await Promise.all([
    getPublishedExperiences(),
    getPagesContent(),
  ]);

  const lcpImageUrl =
    experiences[0]?.thumbnailImage?.url || experiences[0]?.featuredImage?.url;

  return (
    <>
      {lcpImageUrl && <link rel="preload" as="image" href={lcpImageUrl} />}
      <ExperiencesPageClientB experiences={experiences} content={content ?? undefined} />
    </>
  );
}
