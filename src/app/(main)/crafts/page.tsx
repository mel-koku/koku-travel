import type { Metadata } from "next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CraftShellLazy } from "@/components/features/craft/CraftShellLazy";

export const metadata: Metadata = {
  title: "Traditional Crafts of Japan | Koku Travel",
  description:
    "Explore traditional Japanese craft workshops — pottery, textile weaving, lacquerware, indigo dyeing, and more hands-on experiences.",
  openGraph: {
    title: "Traditional Crafts of Japan | Koku Travel",
    description:
      "Explore traditional Japanese craft workshops — pottery, textile weaving, lacquerware, indigo dyeing, and more hands-on experiences.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default function CraftsPage() {
  return (
    <ErrorBoundary>
      <CraftShellLazy />
    </ErrorBoundary>
  );
}
