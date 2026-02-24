"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { PagesContent } from "@/types/sanitySiteContent";

const PlacesShellB = dynamic(
  () => import("./PlacesShellB").then((m) => ({ default: m.PlacesShellB })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100dvh] bg-[var(--background)]">
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <p className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.02em] text-[var(--foreground)] text-center">
            Places in Japan
          </p>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Finding places\u2026</p>
        </div>
        <div className="px-4">
          <div className="h-10 w-full rounded-xl bg-[var(--surface)] animate-pulse mb-4" />
          <div className="flex flex-col lg:flex-row lg:gap-4">
            <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-white animate-pulse" style={{ boxShadow: "var(--shadow-card)" }} />
              ))}
            </div>
            <div className="hidden lg:block lg:w-1/2 h-[calc(100dvh-176px)] rounded-2xl bg-[var(--surface)] animate-pulse" />
          </div>
        </div>
      </div>
    ),
  },
);

export function PlacesShellBLazy({ content }: { content?: PagesContent }) {
  return (
    <ErrorBoundary>
      <PlacesShellB content={content} />
    </ErrorBoundary>
  );
}
