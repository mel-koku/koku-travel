/**
 * Dashboard loading skeleton
 * Shown while the dashboard page is loading
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-surface pb-16 sm:pb-20 md:pb-24">
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* Header skeleton */}
        <div className="rounded-2xl border border-border bg-background p-4 shadow-md sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-7 w-32 animate-pulse rounded-lg bg-border"></div>
              <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-border"></div>
            </div>
            <div className="hidden h-10 w-10 animate-pulse rounded-full bg-border sm:block"></div>
          </div>

          {/* Two-column layout skeleton */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Account section skeleton */}
            <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="h-6 w-24 animate-pulse rounded-lg bg-border"></div>
                <div className="h-10 w-24 animate-pulse rounded-lg bg-border"></div>
              </div>
              <div className="h-16 w-full animate-pulse rounded-lg bg-border"></div>
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded-lg bg-border"></div>
                <div className="h-10 w-full animate-pulse rounded-lg bg-border"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 animate-pulse rounded-lg bg-border"></div>
                <div className="h-10 w-32 animate-pulse rounded-lg bg-border"></div>
              </div>
            </div>

            {/* Stats section skeleton */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="rounded-xl border border-border p-4">
                <div className="h-3 w-16 animate-pulse rounded bg-border"></div>
                <div className="mt-2 h-8 w-12 animate-pulse rounded-lg bg-border"></div>
                <div className="mt-3 h-4 w-28 animate-pulse rounded bg-border"></div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="h-3 w-28 animate-pulse rounded bg-border"></div>
                <div className="mt-2 h-8 w-12 animate-pulse rounded-lg bg-border"></div>
                <div className="mt-3 h-4 w-28 animate-pulse rounded bg-border"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Itinerary preview skeleton */}
        <div className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-40 animate-pulse rounded-lg bg-border"></div>
            <div className="h-10 w-48 animate-pulse rounded-lg bg-border"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="h-12 w-12 animate-pulse rounded-lg bg-border"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 animate-pulse rounded bg-border"></div>
                  <div className="h-4 w-32 animate-pulse rounded bg-border"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
