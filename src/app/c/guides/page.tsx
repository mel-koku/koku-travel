import { getPublishedGuides } from "@/lib/guides/guideService";
import { GuidesPageClientC } from "@c/features/guides/GuidesPageClientC";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata = {
  title: "Travel Guides | Koku Travel",
  description:
    "Curated travel guides for Japan. Expert tips organized by region, season, and trip style.",
  openGraph: {
    title: "Travel Guides | Koku Travel",
    description:
      "Curated travel guides for Japan. Expert tips organized by region, season, and trip style.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function GuidesPageC() {
  const [guides, content] = await Promise.all([
    getPublishedGuides(),
    getPagesContent(),
  ]);

  const lcpImageUrl = guides[0]?.thumbnailImage || guides[0]?.featuredImage;

  return (
    <>
      {lcpImageUrl && <link rel="preload" as="image" href={lcpImageUrl} />}
      <GuidesPageClientC guides={guides} content={content ?? undefined} />
    </>
  );
}
