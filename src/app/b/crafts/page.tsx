import type { Metadata } from "next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CraftShellBLazy } from "@b/features/craft/CraftShellBLazy";

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

export default function CraftsBPage() {
  return (
    <ErrorBoundary>
      <CraftShellBLazy />
    </ErrorBoundary>
  );
}
