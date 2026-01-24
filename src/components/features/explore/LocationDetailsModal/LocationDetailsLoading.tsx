export function LocationDetailsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-64 w-full animate-pulse rounded-2xl bg-surface" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="h-5 w-3/4 animate-pulse rounded bg-surface" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-surface" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-surface" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-5 w-1/2 animate-pulse rounded bg-surface" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-surface" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-surface" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-surface" />
          </div>
        </div>
      </div>
    </div>
  );
}

