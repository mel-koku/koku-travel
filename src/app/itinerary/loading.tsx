export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Header */}
        <div className="mb-8 space-y-3">
          <div className="h-8 w-48 rounded-xl bg-surface animate-pulse" />
          <div className="h-5 w-32 rounded-xl bg-surface animate-pulse" />
        </div>
        {/* Timeline skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-5 w-16 rounded-xl bg-surface animate-pulse shrink-0" />
              <div className="flex-1 h-24 rounded-xl bg-surface animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
