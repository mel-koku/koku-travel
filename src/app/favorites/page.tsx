import { FavoritesClient } from "./FavoritesClient";
import { getPagesContent } from "@/lib/sanity/contentService";

export const revalidate = 3600;

export default async function FavoritesPage() {
  const content = await getPagesContent();

  return <FavoritesClient content={content ?? undefined} />;
}
