"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { PagesContent } from "@/types/sanitySiteContent";

const ExploreShell = dynamic(
  () => import("./ExploreShell").then((m) => ({ default: m.ExploreShell })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100dvh] bg-background">
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <p className="font-serif italic text-2xl sm:text-3xl text-foreground text-center">
            Explore Japan
          </p>
          <p className="mt-3 text-sm text-stone">Loading places...</p>
        </div>
        <div className="px-4">
          <div className="h-10 w-full rounded shimmer mb-4" />
          <div className="flex flex-col lg:flex-row lg:gap-4">
            <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl shimmer" />
              ))}
            </div>
            <div className="hidden lg:block lg:w-1/2 h-[calc(100dvh-176px)] rounded-2xl shimmer" />
          </div>
        </div>
      </div>
    ),
  }
);

export function ExploreShellLazy({ content }: { content?: PagesContent }) {
  return (
    <ErrorBoundary>
      <ExploreShell content={content} />
    </ErrorBoundary>
  );
}
