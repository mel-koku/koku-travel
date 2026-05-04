"use client";

import { useRouter } from "next/navigation";
import { typography } from "@/lib/typography-system";

type ExperiencePlanCTAProps = {
  experienceSlug: string;
  experienceTitle: string;
  locationIds: string[];
  city?: string;
  region?: string;
};

const CONTENT_CONTEXT_KEY = "yuku:content-context";

export function ExperiencePlanCTA({
  experienceSlug,
  experienceTitle,
  locationIds,
  city,
  region,
}: ExperiencePlanCTAProps) {
  const router = useRouter();

  function handleClick() {
    const contentContext = {
      type: "experience" as const,
      slug: experienceSlug,
      title: experienceTitle,
      locationIds,
      city,
      region,
    };
    // localStorage throws QuotaExceededError when full, and SecurityError
    // in iOS Safari Private mode (quota is 0). Don't let either swallow
    // the navigation — the trip-builder still works without seed context.
    try {
      localStorage.setItem(CONTENT_CONTEXT_KEY, JSON.stringify(contentContext));
    } catch {
      // Best-effort — proceed without seed context
    }
    router.push("/trip-builder");
  }

  const hasLocations = locationIds.length > 0;

  return (
    <section className="bg-canvas py-12 px-6 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className={typography({ intent: "editorial-h2" })}>
          Add this to your trip
        </h2>
        <p className="mt-3 text-foreground-secondary">
          {hasLocations
            ? `We'll work these ${locationIds.length} spots into your itinerary.`
            : city
              ? `Plan a trip to ${city[0]?.toUpperCase()}${city.slice(1)}.`
              : "Start planning your Japan trip."}
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
