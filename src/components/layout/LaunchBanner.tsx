"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";

type LaunchBannerProps = {
  initialRemaining: number | null;
  initialTotal: number | null;
};

const ALMOST_GONE_THRESHOLD = 20;

export function LaunchBanner({ initialRemaining, initialTotal }: LaunchBannerProps) {
  const [remaining] = useState<number | null>(initialRemaining);
  const [total] = useState<number | null>(initialTotal);

  if (remaining === null || total === null) return null;

  const isSoldOut = remaining === 0;
  const isAlmostGone = remaining > 0 && remaining <= ALMOST_GONE_THRESHOLD;

  const centerCopy = isSoldOut
    ? "Launch pricing now live from $19."
    : isAlmostGone
      ? "Almost gone. Trip Pass is free for our final few travellers."
      : `Trip Pass is free for our first ${total} travellers.`;

  return (
    <aside
      role="region"
      aria-label="Launch promotion announcement"
      className="relative flex h-10 items-center border-b border-default bg-canvas sm:h-9"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <span
          className={cn(
            typography({ intent: "utility-label" }),
            "hidden shrink-0 sm:inline-block",
          )}
        >
          Launch offer
        </span>
        <Link
          href="/pricing"
          className={cn(
            typography({ intent: "utility-body" }),
            "flex-1 text-center text-foreground hover:underline underline-offset-4",
          )}
        >
          {centerCopy}
        </Link>
        {!isSoldOut && (
          <span
            aria-live="polite"
            className={cn(
              typography({ intent: "utility-tabular" }),
              "hidden shrink-0 sm:inline-block",
            )}
          >
            {remaining} / {total}
          </span>
        )}
      </div>
    </aside>
  );
}
