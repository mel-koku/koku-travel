import type { Metadata } from "next";

import { SavedClient } from "./SavedClient";
import { getPagesContent } from "@/lib/sanity/contentService";
import { DEFAULT_OG_IMAGES } from "@/lib/seo/defaults";

export const metadata: Metadata = {
  title: "Saved Places | Yuku Japan",
  description: "Your saved Japan places and experiences. The shortlist you'll come back to.",
  alternates: { canonical: "/saved" },
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: "Saved Places | Yuku Japan",
    description: "Your saved Japan places and experiences. The shortlist you'll come back to.",
    url: "/saved",
    siteName: "Yuku Japan",
    type: "website",
  },
  robots: { index: false, follow: true },
};

// Force dynamic rendering — page shows user-specific content
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const content = await getPagesContent();

  return <SavedClient content={content ?? undefined} />;
}
