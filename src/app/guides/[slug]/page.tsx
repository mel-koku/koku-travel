import { notFound } from "next/navigation";
import { Metadata } from "next";

import { getGuideWithLocations } from "@/lib/guides/guideService";
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

  return <GuideDetailClient guide={guide} locations={locations} />;
}
