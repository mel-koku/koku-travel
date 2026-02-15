export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="aspect-[21/9] w-full bg-surface animate-pulse" />
      {/* Content skeleton */}
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16 lg:py-20 space-y-6">
        <div className="h-8 w-2/3 rounded-xl bg-surface animate-pulse" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded-xl bg-surface animate-pulse" />
          <div className="h-4 w-full rounded-xl bg-surface animate-pulse" />
          <div className="h-4 w-3/4 rounded-xl bg-surface animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full rounded-xl bg-surface animate-pulse" />
          <div className="h-4 w-5/6 rounded-xl bg-surface animate-pulse" />
        </div>
      </div>
    </div>
  );
}
