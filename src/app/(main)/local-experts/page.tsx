import type { Metadata } from "next";
import { LocalExpertsShellLazy } from "@/components/features/local-experts/LocalExpertsShellLazy";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Local Experts — Artisans, Guides & Hosts | Koku Travel",
  description:
    "Browse local artisans, guides, and hosts across Japan. Find the right expert for your trip and request a booking.",
};

export default function LocalExpertsPage() {
  return (
    <ErrorBoundary>
      <LocalExpertsShellLazy />
    </ErrorBoundary>
  );
}
