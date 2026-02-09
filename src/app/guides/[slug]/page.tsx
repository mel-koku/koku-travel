import { notFound } from "next/navigation";
import { Metadata } from "next";

import {
  getGuideWithLocations,
  getGuidesByCity,
  getGuidesByType,
} from "@/lib/guides/guideService";
import { GuideDetailClient } from "@/components/features/guides/GuideDetailClient";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getGuideWithLocations(slug);

  if (!result) {
    return {
      title: "Guide Not Found | Koku Travel",
    };
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

// Dynamic rendering - no generateStaticParams to avoid cookies() build-time error
export const dynamic = "force-dynamic";

export default async function GuideDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await getGuideWithLocations(slug);

  if (!result) {
    notFound();
  }

  const { guide, locations } = result;

  // Fetch one related guide: prefer same city, fallback to same type
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
    />
  );
}
