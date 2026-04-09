import { ExperiencesComingSoon } from "@/components/features/experiences/ExperiencesComingSoon";

export const metadata = {
  title: "Experiences | Yuku Japan",
  description:
    "Curated Japan experiences coming soon. Explore our guides and places in the meantime.",
  robots: { index: false },
};

export default function ExperiencesPage() {
  return <ExperiencesComingSoon variant="a" />;
}
