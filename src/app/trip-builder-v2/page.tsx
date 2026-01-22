"use client";

import { useCallback } from "react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TripBuilderProvider } from "@/context/TripBuilderContext";
import { TripBuilderV2 } from "@/components/features/trip-builder-v2";

function TripBuilderV2Content() {
  const handleComplete = useCallback(() => {
    // Navigate to itinerary generation page
    // For now, we'll just show an alert
    alert("Trip planning complete! Itinerary generation would happen here.");
    // In production: router.push("/itinerary/new");
  }, []);

  return <TripBuilderV2 onComplete={handleComplete} />;
}

export default function TripBuilderV2Page() {
  return (
    <ErrorBoundary>
      <TripBuilderProvider>
        <TripBuilderV2Content />
      </TripBuilderProvider>
    </ErrorBoundary>
  );
}
