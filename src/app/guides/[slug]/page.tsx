import { cache } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";

import {
  getGuideWithLocations,
  getGuidesByCity,
  getGuidesByType,
  getSanityGuideWithLocations,
} from "@/lib/guides/guideService";
import { GuideDetailClient } from "@/components/features/guides/GuideDetailClient";
import { urlFor } from "@/sanity/image";

// Request-scoped cache: deduplicates fetches between generateMetadata() and page component
const getCachedSanityGuide = cache((slug: string) => getSanityGuideWithLocations(slug));
const getCachedSupabaseGuide = cache((slug: string) => getGuideWithLocations(slug));

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Try Sanity first
  const sanityResult = await getCachedSanityGuide(slug);
  if (sanityResult) {
    const { guide } = sanityResult;
    const imageUrl =
      guide.featuredImage?.url ||
      urlFor(guide.featuredImage).width(1200).url();
    return {
      title: `${guide.title} | Koku Travel`,
      description: guide.summary,
      openGraph: {
        title: guide.title,
        description: guide.summary,
        images: [imageUrl],
        type: "article",
      },
    };
  }

  // Fallback to Supabase
  const result = await getCachedSupabaseGuide(slug);
  if (!result) {
    return { title: "Guide Not Found | Koku Travel" };
  }

  const { guide } = result;
  return {
    title: `${guide.title} | Koku Travel`,
    description: guide.summary,
    openGraph: {
      title: guide.title,
      description: guide.summary,
      images: [guide.featuredImage],
      type: "article",
    },
  };
}

// ISR with on-demand revalidation via webhook
export const revalidate = 3600;

export default async function GuideDetailPage({ params }: Props) {
  const { slug } = await params;

  // Try Sanity first (uses request-scoped cache — shared with generateMetadata)
  const sanityResult = await getCachedSanityGuide(slug);
  if (sanityResult) {
    const { guide, locations } = sanityResult;

    // Related guides still from Supabase
    let relatedGuides = guide.city
      ? await getGuidesByCity(guide.city, guide.slug, 1)
      : [];
    if (relatedGuides.length === 0) {
      relatedGuides = await getGuidesByType(guide.guideType, guide.slug, 1);
    }
    const relatedGuide = relatedGuides[0] ?? null;

    return (
      <GuideDetailClient
        sanityGuide={guide}
        locations={locations}
        relatedGuide={relatedGuide}
        source="sanity"
      />
    );
  }

  // Fallback to Supabase (uses request-scoped cache — shared with generateMetadata)
  const result = await getCachedSupabaseGuide(slug);
  if (!result) {
    notFound();
  }

  const { guide, locations } = result;

  let relatedGuides = guide.city
    ? await getGuidesByCity(guide.city, guide.id, 1)
    : [];
  if (relatedGuides.length === 0) {
    relatedGuides = await getGuidesByType(guide.guideType, guide.id, 1);
  }
  const relatedGuide = relatedGuides[0] ?? null;

  return (
    <GuideDetailClient
      guide={guide}
      locations={locations}
      relatedGuide={relatedGuide}
      source="supabase"
    />
  );
}
