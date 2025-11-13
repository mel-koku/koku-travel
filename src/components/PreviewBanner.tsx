"use client";

import Link from "next/link";

export default function PreviewBanner() {
  return (
    <div className="bg-amber-500 px-4 py-2 text-sm text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <span className="font-medium">
          Preview mode is active. Draft content is visible only to you.
        </span>
        <Link
          href="/api/preview/exit"
          className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide transition hover:bg-white/30"
        >
          Exit Preview
        </Link>
      </div>
    </div>
  );
}

