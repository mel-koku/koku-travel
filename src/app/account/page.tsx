import { AccountClient } from "./AccountClient";
import { getPagesContent } from "@/lib/sanity/contentService";

export const revalidate = 3600;

export default async function AccountPage() {
  const content = await getPagesContent();

  return <AccountClient content={content ?? undefined} />;
}
