"use client";

import { useRouter } from "next/navigation";

type ExperiencePlanCTAProps = {
  experienceSlug: string;
  experienceTitle: string;
  locationIds: string[];
  city?: string;
  region?: string;
};

const CONTENT_CONTEXT_KEY = "koku:content-context";

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
    localStorage.setItem(CONTENT_CONTEXT_KEY, JSON.stringify(contentContext));
    router.push("/trip-builder");
  }

  const hasLocations = locationIds.length > 0;

  return (
    <section className="bg-canvas py-12 px-6 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif italic text-2xl sm:text-3xl text-foreground">
          Make this part of your trip
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
          className="mt-6 inline-flex items-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98]"
        >
          Build My Itinerary
        </button>
      </div>
    </section>
  );
}
