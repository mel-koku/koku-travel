import type { Metadata } from "next";
import { getPublishedGuides } from "@/lib/guides/guideService";
import { GuidesPageClient } from "@/components/features/guides/GuidesPageClient";
import { getPagesContent } from "@/lib/sanity/contentService";

const GUIDES_DESCRIPTION =
  "Curated travel guides for Japan. Seasonal highlights, regional deep dives, and expert tips for your trip.";

export const metadata: Metadata = {
  title: "Travel Guides | Yuku Japan",
  description: GUIDES_DESCRIPTION,
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Travel Guides | Yuku Japan",
    description: GUIDES_DESCRIPTION,
    url: "/guides",
    siteName: "Yuku Japan",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel Guides | Yuku Japan",
    description: GUIDES_DESCRIPTION,
  },
};

export const revalidate = 3600;

export default async function GuidesPage() {
  const [guides, content] = await Promise.all([
    getPublishedGuides(),
    getPagesContent(),
  ]);

  // Preload LCP image — first guide card's thumbnail/featured image
  const lcpImageUrl = guides[0]?.thumbnailImage || guides[0]?.featuredImage;

  return (
    <>
      {lcpImageUrl && <link rel="preload" as="image" href={lcpImageUrl} />}
      <div className="min-h-[100dvh] bg-background">
        <GuidesPageClient guides={guides} content={content ?? undefined} />
      </div>
    </>
  );
}
