import { getPublishedGuides } from "@/lib/guides/guideService";
import { GuidesPageClient } from "@/components/features/guides/GuidesPageClient";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata = {
  title: "Travel Guides | Yuku Japan",
  description:
    "Curated travel guides for Japan. Seasonal highlights, regional deep dives, and expert tips for your trip.",
  openGraph: {
    title: "Travel Guides | Yuku Japan",
    description:
      "Curated travel guides for Japan. Seasonal highlights, regional deep dives, and expert tips for your trip.",
    siteName: "Yuku Japan",
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
