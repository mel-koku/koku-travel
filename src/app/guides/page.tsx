import { getPublishedGuides } from "@/lib/guides/guideService";
import { GuidesPageClient } from "@/components/features/guides/GuidesPageClient";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Travel Guides | Koku Travel",
  description:
    "Discover curated travel guides for Japan. From hidden gems to seasonal highlights, find expert tips and local insights for your perfect trip.",
};

export default async function GuidesPage() {
  const guides = await getPublishedGuides();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Read"
        title="Guides"
        subtitle="Local knowledge, seasonal intel, and the stories behind the places."
        imageUrl="/images/regions/kansai-hero.jpg"
      />

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <GuidesPageClient guides={guides} />
      </div>
    </div>
  );
}
