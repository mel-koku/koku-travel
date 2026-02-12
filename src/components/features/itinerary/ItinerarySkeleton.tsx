"use client";

import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Activity card skeleton that matches PlaceActivityRow layout
 */
function ActivityCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
      <div className="space-y-2">
        {/* Header with drag handle, number, title */}
        <div className="flex items-start gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
        </div>
        {/* Time badges */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        {/* Description */}
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        {/* Tags */}
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Travel segment skeleton between activities
 */
function TravelSegmentSkeleton() {
  return (
    <div className="flex items-center gap-2 py-2 px-4">
      <div className="h-px flex-1 bg-border" />
      <Skeleton className="h-6 w-24 rounded-full" />
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/**
 * Day selector skeleton
 */
function DaySelectorSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-10 w-16 shrink-0 rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Map panel skeleton
 */
function MapSkeleton() {
  return (
    <div className="h-full w-full rounded-xl bg-surface">
      <div className="flex h-full flex-col p-4">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="relative flex-1 rounded-xl border border-border bg-surface/30">
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full page skeleton matching ItineraryShell layout
 */
export function ItinerarySkeleton() {
  return (
    <div className="bg-surface py-6 sm:py-8 md:py-10">
      <section className="mx-auto min-h-[calc(100dvh-120px)] max-w-screen-2xl p-3 sm:p-4 md:p-6 md:min-h-[calc(100dvh-140px)]">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(380px,40%)_1fr] xl:gap-6">
          {/* Left column: Header + Map panel */}
          <div className="order-2 flex flex-col gap-4 xl:order-1">
            {/* Header section */}
            <div className="rounded-2xl border border-border bg-background p-3 shadow-sm sm:p-4">
              <div className="space-y-3">
                <Skeleton className="h-8 w-48 sm:h-9" />
                <Skeleton className="h-4 w-64" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
              <div className="mt-4">
                <DaySelectorSkeleton />
              </div>
            </div>
            {/* Map panel */}
            <div className="sticky h-[400px] rounded-2xl border border-border bg-background shadow-sm sm:h-[500px] xl:h-[calc(100dvh-280px)] xl:min-h-[400px]">
              <MapSkeleton />
            </div>
          </div>

          {/* Timeline panel */}
          <div className="order-1 flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm xl:order-2">
            <div className="flex-1 overflow-y-auto p-3 pr-2 sm:p-4">
              {/* Day header skeleton */}
              <div className="mb-6 rounded-xl border border-border bg-surface p-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Activity cards with travel segments */}
              <div className="space-y-3">
                <ActivityCardSkeleton />
                <TravelSegmentSkeleton />
                <ActivityCardSkeleton />
                <TravelSegmentSkeleton />
                <ActivityCardSkeleton />
                <TravelSegmentSkeleton />
                <ActivityCardSkeleton />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
