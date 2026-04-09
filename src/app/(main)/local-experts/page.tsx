import type { Metadata } from "next";
import { LocalExpertsComingSoon } from "@/components/features/local-experts/LocalExpertsComingSoon";

export const metadata: Metadata = {
  title: "Local Experts | Yuku Japan",
  description:
    "Connect with local artisans and guides across Japan. Coming soon.",
  alternates: {
    canonical: "/local-experts",
  },
  robots: { index: false },
};

export default function LocalExpertsPage() {
  return <LocalExpertsComingSoon />;
}
