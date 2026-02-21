"use client";

import { useRouter } from "next/navigation";

type GuidePlanCTAProps = {
  guideSlug: string;
  guideTitle: string;
  locationIds: string[];
  city?: string;
  region?: string;
};

const CONTENT_CONTEXT_KEY = "koku:content-context";

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
    localStorage.setItem(CONTENT_CONTEXT_KEY, JSON.stringify(contentContext));
    router.push("/trip-builder");
  }

  return (
    <section className="bg-canvas py-12 px-6 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif italic text-2xl sm:text-3xl text-foreground">
          Turn this guide into a trip
        </h2>
        <p className="mt-3 text-foreground-secondary">
          We&apos;ll prioritize these {locationIds.length} places when building your itinerary.
        </p>
        <button
          type="button"
          onClick={handleClick}
          className="mt-6 inline-flex items-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98]"
        >
          Build My Itinerary
        </button>
      </div>
    </section>
  );
}
