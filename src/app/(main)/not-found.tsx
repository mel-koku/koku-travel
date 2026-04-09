import type { Metadata } from "next";

import { getPagesContent } from "@/lib/sanity/contentService";
import { NotFoundClient } from "./NotFoundClient";

export const metadata: Metadata = {
  title: "Page Not Found | Yuku Japan",
  description: "The page you're looking for doesn't exist. Explore Japan travel guides, itineraries, and experiences with Yuku Japan.",
  openGraph: {
    title: "Page Not Found | Yuku Japan",
    description: "The page you're looking for doesn't exist. Explore Japan travel guides, itineraries, and experiences with Yuku Japan.",
    siteName: "Yuku Japan",
  },
};

export default async function NotFound() {
  const content = await getPagesContent();

  return <NotFoundClient content={content ?? undefined} />;
}
