import type { Metadata } from "next";
import { LocalExpertsShellBLazy } from "@/components-b/features/local-experts/LocalExpertsShellBLazy";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Local Experts — Artisans & Guides | Koku Travel",
  description:
    "Browse local artisans and guides across Japan. Find the right expert for your trip and request a booking.",
};

export default function LocalExpertsBPage() {
  return (
    <ErrorBoundary>
      <LocalExpertsShellBLazy />
    </ErrorBoundary>
  );
}
