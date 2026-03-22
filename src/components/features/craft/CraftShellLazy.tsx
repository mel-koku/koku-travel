"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const CraftShell = dynamic(
  () => import("./CraftShell").then((m) => ({ default: m.CraftShell })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100dvh] bg-background">
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <p className="font-serif text-2xl sm:text-3xl text-foreground text-center">
            Traditional Crafts
          </p>
          <p className="mt-3 text-sm text-stone">Loading workshops&hellip;</p>
        </div>
        <div className="px-4">
          <div className="h-10 w-full rounded shimmer mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl shimmer" />
            ))}
          </div>
        </div>
      </div>
    ),
  }
);

export function CraftShellLazy() {
  return (
    <ErrorBoundary>
      <CraftShell />
    </ErrorBoundary>
  );
}
