import type { Metadata } from "next";

import { FavoritesClient } from "./FavoritesClient";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Favorites | Koku Travel",
  description: "Your saved locations and experiences in Japan. Build your personal collection of must-visit places.",
  openGraph: {
    title: "Favorites | Koku Travel",
    description: "Your saved locations and experiences in Japan. Build your personal collection of must-visit places.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function FavoritesPage() {
  const content = await getPagesContent();

  return <FavoritesClient content={content ?? undefined} />;
}
