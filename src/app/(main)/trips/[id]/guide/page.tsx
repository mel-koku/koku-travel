"use client";

import { use } from "react";
import Link from "next/link";
import { useAppState } from "@/state/AppState";
import { BeforeYouLandTab } from "@/components/features/itinerary/before-you-land/BeforeYouLandTab";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";

export default function TripGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { trips } = useAppState();
  const trip = trips.find((t) => t.id === id);

  if (!trip) {
    return (
      <main className="max-w-[760px] mx-auto px-6 py-24 text-center">
        <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-4")}>
          Trip not found
        </h1>
        <p className="text-foreground-body mb-8">
          This trip isn&apos;t on this device. Sign in to sync it across devices.
        </p>
        <Link
          href="/dashboard"
          className="text-accent underline underline-offset-2"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  const briefing = trip.culturalBriefing;

  if (!briefing) {
    return (
      <main className="max-w-[760px] mx-auto px-6 py-24 text-center">
        <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-4")}>
          Before you land
        </h1>
        <p className="text-foreground-body mb-8">
          We haven&apos;t prepared a cultural briefing for this trip yet.
        </p>
        <Link
          href="/itinerary"
          className="text-accent underline underline-offset-2"
        >
          Back to trip
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-[760px] mx-auto px-6 py-16">
      <BeforeYouLandTab briefing={briefing} />
      <div className="mt-16 pt-8 border-t border-border text-sm">
        <Link
          href="/itinerary"
          className="text-accent underline underline-offset-2"
        >
          &larr; Back to trip
        </Link>
      </div>
    </main>
  );
}
