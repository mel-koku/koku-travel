import { getPublishedGuides } from "@/lib/guides/guideService";
import { GuidesPageClient } from "@/components/features/guides/GuidesPageClient";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata = {
  title: "Travel Guides | Koku Travel",
  description:
    "Discover curated travel guides for Japan. From hidden gems to seasonal highlights, find expert tips and local insights for your perfect trip.",
  openGraph: {
    title: "Travel Guides | Koku Travel",
    description:
      "Discover curated travel guides for Japan. From hidden gems to seasonal highlights, find expert tips and local insights for your perfect trip.",
    siteName: "Koku Travel",
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
      <div className="min-h-screen bg-background">
        <GuidesPageClient guides={guides} content={content ?? undefined} />
      </div>
    </>
  );
}
