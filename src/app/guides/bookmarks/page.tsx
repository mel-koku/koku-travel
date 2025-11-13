import { draftMode } from "next/headers";
import { BookmarksClient } from "./BookmarksClient";
import { fetchGuides } from "@/lib/sanity/guides";

export default async function GuideBookmarksPage() {
  const { isEnabled } = await draftMode();
  const guides = await fetchGuides({ preview: isEnabled });
  return <BookmarksClient guides={guides} />;
}
