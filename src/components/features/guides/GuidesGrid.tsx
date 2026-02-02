"use client";

import type { GuideSummary } from "@/types/guide";
import { GuideCard } from "./GuideCard";

type GuidesGridProps = {
  guides: GuideSummary[];
};

export function GuidesGrid({ guides }: GuidesGridProps) {
  if (guides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
          <BookIcon className="h-8 w-8 text-stone" />
        </div>
        <p className="text-base font-medium text-charcoal mb-1">
          No guides available yet
        </p>
        <p className="text-sm text-stone text-center max-w-sm">
          We&apos;re working on curated travel guides. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Travel guides">
      <div className="grid gap-x-5 gap-y-8 sm:gap-x-6 sm:gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {guides.map((guide) => (
          <GuideCard key={guide.id} guide={guide} />
        ))}
      </div>
    </section>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}
