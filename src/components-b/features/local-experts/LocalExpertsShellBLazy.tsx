"use client";

import dynamic from "next/dynamic";

const LocalExpertsShellB = dynamic(
  () =>
    import("./LocalExpertsShellB").then((m) => ({
      default: m.LocalExpertsShellB,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    ),
  }
);

export function LocalExpertsShellBLazy() {
  return <LocalExpertsShellB />;
}
