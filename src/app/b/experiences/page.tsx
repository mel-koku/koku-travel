import type { Metadata } from "next";
import { ExperiencesShellBLazy } from "@b/features/experiences-unified/ExperiencesShellBLazy";

export const metadata: Metadata = {
  title: "Experiences | Koku Travel",
  description:
    "Discover hands-on workshops, cultural immersions, and unforgettable experiences across Japan. From traditional crafts to culinary adventures.",
  openGraph: {
    title: "Experiences | Koku Travel",
    description:
      "Discover hands-on workshops, cultural immersions, and unforgettable experiences across Japan. From traditional crafts to culinary adventures.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default function ExperiencesPageB() {
  return <ExperiencesShellBLazy />;
}
