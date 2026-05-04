"use client";

import { useRouter } from "next/navigation";
import { typography } from "@/lib/typography-system";

type GuidePlanCTAProps = {
  guideSlug: string;
  guideTitle: string;
  locationIds: string[];
  city?: string;
  region?: string;
};

const CONTENT_CONTEXT_KEY = "yuku:content-context";

export function GuidePlanCTA({
  guideSlug,
  guideTitle,
  locationIds,
  city,
  region,
}: GuidePlanCTAProps) {
  const router = useRouter();

  if (locationIds.length === 0) return null;

  function handleClick() {
    const contentContext = {
      type: "guide" as const,
      slug: guideSlug,
      title: guideTitle,
      locationIds,
      city,
      region,
    };
    // localStorage throws in iOS Safari Private mode (0 quota) and when
    // full. Catch so the navigation still happens.
    try {
      localStorage.setItem(CONTENT_CONTEXT_KEY, JSON.stringify(contentContext));
    } catch {
      // Best-effort — proceed without seed context
    }
    router.push("/trip-builder");
  }

  return (
    <section className="bg-canvas py-12 px-6 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className={typography({ intent: "editorial-h2" })}>
          Turn this guide into a trip
        </h2>
        <p className="mt-3 text-foreground-secondary">
          We&apos;ll prioritize these {locationIds.length} places when building your itinerary.
        </p>
        <button
          type="button"
          onClick={handleClick}
          className="mt-6 inline-flex items-center rounded-lg bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90 hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
        >
          Build my itinerary
        </button>
      </div>
    </section>
  );
}
