"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const DiscoverShell = dynamic(
  () => import("./DiscoverShell").then((m) => ({ default: m.DiscoverShell })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100dvh-5rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <p className="font-serif italic text-2xl text-foreground">
            Discover Nearby
          </p>
          <div className="h-6 w-6 rounded-full border-2 border-sage border-t-transparent animate-spin" />
        </div>
      </div>
    ),
  },
);

export function DiscoverShellLazy() {
  return (
    <ErrorBoundary>
      <DiscoverShell />
    </ErrorBoundary>
  );
}
