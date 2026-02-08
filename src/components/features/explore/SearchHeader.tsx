"use client";

type SearchHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  totalCount: number;
};

export function SearchHeader({ query, onQueryChange, totalCount }: SearchHeaderProps) {
  return (
    <div className="bg-background border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Explore Japan
            </h1>
            <p className="mt-1 text-sm text-stone">
              Discover {totalCount.toLocaleString()} unique destinations
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80 lg:w-96">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                className="h-5 w-5 text-stone"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search destinations..."
              className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-stone shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50 hover:shadow-md"
            />
            {query && (
              <button
                onClick={() => onQueryChange("")}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-stone hover:text-foreground"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
