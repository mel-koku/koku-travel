import type { Metadata } from "next";
import { LocalExpertsShellLazy } from "@/components/features/local-experts/LocalExpertsShellLazy";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Local Experts — Artisans & Guides | Koku Travel",
  description:
    "Browse local artisans and guides across Japan. Find the right expert for your trip and request a booking.",
  alternates: {
    canonical: "/local-experts",
  },
  openGraph: {
    title: "Local Experts — Artisans & Guides | Koku Travel",
    description:
      "Browse local artisans and guides across Japan. Find the right expert for your trip and request a booking.",
    siteName: "Koku Travel",
  },
};

export default function LocalExpertsPage() {
  return (
    <ErrorBoundary>
      <LocalExpertsShellLazy />
    </ErrorBoundary>
  );
}
