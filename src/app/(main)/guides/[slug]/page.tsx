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
import { buildGuideJsonLd } from "@/lib/guides/guideJsonLd";
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
      title: `${guide.title} | Yuku Japan`,
      description: guide.summary,
      alternates: {
        canonical: `/guides/${slug}`,
      },
      openGraph: {
        title: guide.title,
        description: guide.summary,
        images: [imageUrl],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: guide.title,
        description: guide.summary,
      },
    };
  }

  // Fallback to Supabase
  const result = await getCachedSupabaseGuide(slug);
  if (!result) {
    return { title: "Guide Not Found | Yuku Japan" };
  }

  const { guide } = result;
  return {
    title: `${guide.title} | Yuku Japan`,
    description: guide.summary,
    alternates: {
      canonical: `/guides/${slug}`,
    },
    openGraph: {
      title: guide.title,
      description: guide.summary,
      images: [guide.featuredImage],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.summary,
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

    const imageUrl =
      guide.featuredImage?.url ||
      urlFor(guide.featuredImage).width(1200).url();
    const jsonLd = buildGuideJsonLd({
      slug: guide.slug,
      title: guide.title,
      summary: guide.summary,
      imageUrl,
      authorName: guide.author?.name,
      authorSlug: guide.author?.slug,
      publishedAt: guide.publishedAt,
      updatedAt: guide._updatedAt,
    });

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <GuideDetailClient
          sanityGuide={guide}
          locations={locations}
          relatedGuide={relatedGuide}
          source="sanity"
        />
      </>
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

  const jsonLd = buildGuideJsonLd({
    slug,
    title: guide.title,
    summary: guide.summary,
    imageUrl: guide.featuredImage,
    publishedAt: guide.publishedAt,
    updatedAt: guide.updatedAt,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GuideDetailClient
        guide={guide}
        locations={locations}
        relatedGuide={relatedGuide}
        source="supabase"
      />
    </>
  );
}
