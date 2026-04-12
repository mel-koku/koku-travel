import type { Metadata } from "next";

import { SavedClient } from "./SavedClient";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Saved Places | Yuku Japan",
  description: "Your saved locations and experiences in Japan. Build your personal collection of must-visit places.",
  alternates: { canonical: "/saved" },
  openGraph: {
    title: "Saved Places | Yuku Japan",
    description: "Your saved locations and experiences in Japan. Build your personal collection of must-visit places.",
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
