import { getPagesContent } from "@/lib/sanity/contentService";
import { NotFoundClient } from "./NotFoundClient";

export default async function NotFound() {
  const content = await getPagesContent();

  return <NotFoundClient content={content ?? undefined} />;
}
