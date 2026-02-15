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

  return (
    <div className="min-h-screen bg-background">
      <GuidesPageClient guides={guides} content={content ?? undefined} />
    </div>
  );
}
