"use client";

/**
 * Loading skeleton for the C variant itinerary page.
 * Zero radius, border-based, high contrast.
 */

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ backgroundColor: "var(--border)" }}
    />
  );
}

function ActivityCardSkeleton() {
  return (
    <div
      className="border p-4"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
      }}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Pulse className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Pulse className="h-4 w-3/4" />
            <Pulse className="h-3 w-1/2" />
          </div>
        </div>
        <div className="flex gap-2">
          <Pulse className="h-5 w-20" />
          <Pulse className="h-5 w-20" />
        </div>
        <Pulse className="h-3 w-full" />
        <Pulse className="h-3 w-2/3" />
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
      <Pulse className="h-6 w-24" />
      <div
        className="h-px flex-1 border-t border-dashed"
        style={{ borderColor: "var(--border)" }}
      />
    </div>
  );
}

function DaySelectorSkeleton() {
  return (
    <div className="flex gap-0 border-b" style={{ borderColor: "var(--border)" }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Pulse key={i} className="h-11 w-20 shrink-0" />
      ))}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div
      className="flex h-full w-full flex-col p-5"
      style={{ backgroundColor: "var(--card)" }}
    >
      <div className="mb-4 space-y-2">
        <Pulse className="h-5 w-28" />
        <Pulse className="h-4 w-44" />
      </div>
      <div
        className="relative flex-1 border"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Pulse className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

export function ItinerarySkeletonC() {
  return (
    <div
      style={{ backgroundColor: "var(--background)" }}
      className="py-6 sm:py-8 md:py-10"
    >
      <section className="mx-auto min-h-[calc(100dvh-120px)] max-w-[1400px] px-6 lg:px-10">
        {/* Header */}
        <div className="mb-6 space-y-3">
          <Pulse className="h-8 w-64" />
          <Pulse className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          {/* Left: Timeline */}
          <div
            className="border"
            style={{ borderColor: "var(--border)" }}
          >
            <DaySelectorSkeleton />
            <div className="p-4 sm:p-5">
              {/* Day header skeleton */}
              <div
                className="mb-6 border-b pb-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="space-y-2">
                  <Pulse className="h-5 w-36" />
                  <Pulse className="h-4 w-52" />
                </div>
              </div>

              {/* Activity cards with travel segments */}
              <div className="space-y-0">
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

          {/* Right: Map */}
          <div
            className="hidden h-[calc(100dvh-200px)] border border-l-0 lg:block"
            style={{ borderColor: "var(--border)" }}
          >
            <MapSkeleton />
          </div>
        </div>
      </section>
    </div>
  );
}
