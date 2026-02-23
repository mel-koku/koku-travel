export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Header skeleton */}
        <div className="mb-8 space-y-3">
          <div className="h-4 w-32 rounded-xl bg-surface animate-pulse" />
          <div className="h-10 w-80 max-w-full rounded-xl bg-surface animate-pulse" />
          <div className="h-5 w-64 max-w-full rounded-xl bg-surface animate-pulse" />
        </div>
        {/* Grid skeleton */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[4/3] rounded-xl bg-surface animate-pulse" />
              <div className="h-5 w-3/4 rounded-xl bg-surface animate-pulse" />
              <div className="h-4 w-1/2 rounded-xl bg-surface animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
