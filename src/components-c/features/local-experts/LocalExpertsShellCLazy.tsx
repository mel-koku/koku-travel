"use client";

import dynamic from "next/dynamic";

const LocalExpertsShellC = dynamic(
  () =>
    import("./LocalExpertsShellC").then((m) => ({
      default: m.LocalExpertsShellC,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10">
        <div className="grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    ),
  }
);

export function LocalExpertsShellCLazy() {
  return <LocalExpertsShellC />;
}
