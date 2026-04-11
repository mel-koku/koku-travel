import type { Metadata } from "next";
import { LocalExpertsComingSoon } from "@/components/features/local-experts/LocalExpertsComingSoon";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Local Experts | Yuku Japan",
  description:
    "Connect with local artisans and guides across Japan. Coming soon.",
  alternates: {
    canonical: "/local-experts",
  },
  robots: { index: false },
};

export default async function LocalExpertsPage() {
  const content = await getPagesContent();
  return <LocalExpertsComingSoon content={content ?? undefined} />;
}
