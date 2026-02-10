import { getTripBuilderConfig } from "@/lib/sanity/contentService";
import TripBuilderClient from "./TripBuilderClient";

export const revalidate = 3600;

export default async function TripBuilderPage() {
  const sanityConfig = await getTripBuilderConfig();

  return <TripBuilderClient sanityConfig={sanityConfig ?? undefined} />;
}
