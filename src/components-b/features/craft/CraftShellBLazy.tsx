"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const CraftShellB = dynamic(
  () => import("./CraftShellB").then((m) => ({ default: m.CraftShellB })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100dvh] bg-[var(--background)]">
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <p className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.02em] text-[var(--foreground)] text-center">
            Traditional Crafts
          </p>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Loading workshops&hellip;</p>
        </div>
        <div className="px-4">
          <div className="h-10 w-full rounded-xl bg-[var(--surface)] animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-white animate-pulse" style={{ boxShadow: "var(--shadow-card)" }} />
            ))}
          </div>
        </div>
      </div>
    ),
  },
);

export function CraftShellBLazy() {
  return (
    <ErrorBoundary>
      <CraftShellB />
    </ErrorBoundary>
  );
}
