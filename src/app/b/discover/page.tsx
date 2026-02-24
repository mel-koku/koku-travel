import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DiscoverShellB } from "@/components-b/features/discover/DiscoverShellB";

export const metadata: Metadata = {
  title: "Discover Nearby | Koku Travel",
  description:
    "Find what's open near you right now. Restaurants, shrines, parks, and hidden gems — all on the map.",
  openGraph: {
    title: "Discover Nearby | Koku Travel",
    description:
      "Find what's open near you right now. Restaurants, shrines, parks, and hidden gems — all on the map.",
    siteName: "Koku Travel",
  },
};

export default function DiscoverPageB() {
  return (
    <ErrorBoundary>
      <DiscoverShellB />
    </ErrorBoundary>
  );
}
