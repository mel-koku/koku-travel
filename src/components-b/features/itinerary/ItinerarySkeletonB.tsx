"use client";

/**
 * Loading skeleton for the B variant itinerary page.
 * Matches the B shell layout: header + day selector + split view.
 */

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ backgroundColor: "var(--surface)" }}
    />
  );
}

function ActivityCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="space-y-3">
        {/* Header: number + title + actions */}
        <div className="flex items-start gap-3">
          <Pulse className="h-8 w-8 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Pulse className="h-4 w-3/4" />
            <Pulse className="h-3 w-1/2" />
          </div>
          <div className="flex gap-1.5">
            <Pulse className="h-7 w-7 rounded-xl" />
            <Pulse className="h-7 w-7 rounded-xl" />
          </div>
        </div>
        {/* Time badges */}
        <div className="flex gap-2">
          <Pulse className="h-5 w-20 rounded-full" />
          <Pulse className="h-5 w-20 rounded-full" />
        </div>
        {/* Description lines */}
        <Pulse className="h-3 w-full" />
        <Pulse className="h-3 w-2/3" />
        {/* Tags */}
        <div className="flex gap-2">
          <Pulse className="h-5 w-16 rounded-full" />
          <Pulse className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function TravelSegmentSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2 px-2">
      <div
        className="h-px flex-1 border-t border-dashed"
        style={{ borderColor: "var(--border)" }}
      />
      <Pulse className="h-6 w-24 rounded-full" />
      <div
        className="h-px flex-1 border-t border-dashed"
        style={{ borderColor: "var(--border)" }}
      />
    </div>
  );
}

function DaySelectorSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 5 }, (_, i) => (
        <Pulse key={i} className="h-10 w-16 shrink-0 rounded-xl" />
      ))}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div
      className="flex h-full w-full flex-col rounded-2xl p-5"
      style={{ backgroundColor: "var(--card)" }}
    >
      <div className="mb-4 space-y-2">
        <Pulse className="h-5 w-28" />
        <Pulse className="h-4 w-44" />
      </div>
      <div
        className="relative flex-1 rounded-2xl border"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Pulse className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ItinerarySkeletonB() {
  return (
    <div style={{ backgroundColor: "var(--background)" }} className="py-6 sm:py-8 md:py-10">
      <section className="mx-auto min-h-[calc(100dvh-120px)] max-w-screen-2xl p-3 sm:p-4 md:p-6 md:min-h-[calc(100dvh-140px)]">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(380px,40%)_1fr] xl:gap-6">
          {/* Left column: Header + Map panel */}
          <div className="order-2 flex flex-col gap-4 xl:order-1">
            {/* Header section */}
            <div
              className="rounded-2xl p-4 sm:p-5"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="space-y-3">
                <Pulse className="h-7 w-48 sm:h-8" />
                <Pulse className="h-4 w-64" />
                <div className="flex gap-2">
                  <Pulse className="h-6 w-16 rounded-full" />
                  <Pulse className="h-6 w-16 rounded-full" />
                </div>
              </div>
              <div className="mt-4">
                <DaySelectorSkeleton />
              </div>
            </div>

            {/* Map panel */}
            <div
              className="sticky h-[400px] rounded-2xl sm:h-[500px] xl:h-[calc(100dvh-280px)] xl:min-h-[400px]"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <MapSkeleton />
            </div>
          </div>

          {/* Timeline panel */}
          <div
            className="order-1 flex flex-col overflow-hidden rounded-2xl xl:order-2"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* Day header skeleton */}
              <div
                className="mb-6 rounded-2xl border p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="space-y-2">
                  <Pulse className="h-6 w-36" />
                  <Pulse className="h-4 w-52" />
                  <div className="flex gap-2">
                    <Pulse className="h-8 w-24 rounded-xl" />
                    <Pulse className="h-8 w-24 rounded-xl" />
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
