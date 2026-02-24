import type { Metadata } from "next";
import { SavedClientB } from "@/components-b/features/saved/SavedClientB";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Saved Places | Koku Travel",
  description: "Your saved locations and experiences in Japan. Build your personal collection of must-visit places.",
  openGraph: {
    title: "Saved Places | Koku Travel",
    description: "Your saved locations and experiences in Japan. Build your personal collection of must-visit places.",
    siteName: "Koku Travel",
  },
};

export const dynamic = "force-dynamic";

export default async function SavedPageB() {
  const content = await getPagesContent();
  return <SavedClientB content={content ?? undefined} />;
}
