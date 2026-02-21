import { cache } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";

import {
  getSanityExperienceBySlug,
  getRelatedExperiences,
} from "@/lib/experiences/experienceService";
import { fetchLocationsByIds } from "@/lib/locations/locationService";
import { ExperienceDetailClient } from "@/components/features/experiences/ExperienceDetailClient";
import { urlFor } from "@/sanity/image";

const getCachedExperience = cache((slug: string) =>
  getSanityExperienceBySlug(slug)
);

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const experience = await getCachedExperience(slug);

  if (!experience) {
    return { title: "Experience Not Found | Koku Travel" };
  }

  const imageUrl = experience.featuredImage?.url
    || (experience.featuredImage
      ? urlFor(experience.featuredImage).width(1200).url()
      : undefined);

  return {
    title: `${experience.title} | Koku Travel`,
    description: experience.summary,
    openGraph: {
      title: experience.title,
      description: experience.summary,
      ...(imageUrl && { images: [imageUrl] }),
      type: "article",
    },
  };
}

export const revalidate = 3600;

export default async function ExperienceDetailPage({ params }: Props) {
  const { slug } = await params;
  const experience = await getCachedExperience(slug);

  if (!experience) {
    notFound();
  }

  const [relatedExperiences, locations] = await Promise.all([
    getRelatedExperiences(experience.experienceType, experience.slug, 3),
    experience.locationIds?.length
      ? fetchLocationsByIds(experience.locationIds)
      : Promise.resolve([]),
  ]);

  return (
    <ExperienceDetailClient
      experience={experience}
      relatedExperiences={relatedExperiences}
      locations={locations}
    />
  );
}
