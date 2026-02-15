import type { Metadata } from "next";

import { getPagesContent } from "@/lib/sanity/contentService";
import { NotFoundClient } from "./NotFoundClient";

export const metadata: Metadata = {
  title: "Page Not Found | Koku Travel",
  description: "The page you're looking for doesn't exist. Explore Japan travel guides, itineraries, and experiences with Koku Travel.",
  openGraph: {
    title: "Page Not Found | Koku Travel",
    description: "The page you're looking for doesn't exist. Explore Japan travel guides, itineraries, and experiences with Koku Travel.",
    siteName: "Koku Travel",
  },
};

export default async function NotFound() {
  const content = await getPagesContent();

  return <NotFoundClient content={content ?? undefined} />;
}
