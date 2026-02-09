import { getPublishedGuides } from "@/lib/guides/guideService";
import { GuidesPageClient } from "@/components/features/guides/GuidesPageClient";

export const metadata = {
  title: "Travel Guides | Koku Travel",
  description:
    "Discover curated travel guides for Japan. From hidden gems to seasonal highlights, find expert tips and local insights for your perfect trip.",
};

export default async function GuidesPage() {
  const guides = await getPublishedGuides();

  return (
    <div className="min-h-screen bg-background">
      <GuidesPageClient guides={guides} />
    </div>
  );
}
