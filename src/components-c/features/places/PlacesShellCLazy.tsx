"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { PagesContent } from "@/types/sanitySiteContent";

const PlacesShellC = dynamic(
  () => import("./PlacesShellC").then((m) => ({ default: m.PlacesShellC })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100dvh] bg-[var(--background)]">
        <div className="flex flex-col items-start px-6 lg:px-10 pt-32 lg:pt-36 pb-4">
          <div className="h-3 w-40 bg-[var(--border)] mb-4" />
          <div className="h-10 w-96 max-w-full bg-[var(--border)]" />
        </div>
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="h-11 w-full bg-[var(--border)] mb-6" />
          <div className="bg-[var(--border)]" style={{ lineHeight: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[var(--background)]">
                  <div className="aspect-[4/3] bg-[var(--border)] animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 w-3/4 bg-[var(--border)]" />
                    <div className="h-3 w-1/2 bg-[var(--border)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
);

export function PlacesShellCLazy({ content }: { content?: PagesContent }) {
  return (
    <ErrorBoundary>
      <PlacesShellC content={content} />
    </ErrorBoundary>
  );
}
