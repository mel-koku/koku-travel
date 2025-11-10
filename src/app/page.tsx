export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-10 py-24">
      <section className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="flex flex-col gap-6">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-red-500">
            Plan without compromise
          </span>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Craft your dream journey across Japan with precision and style.
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Koku helps you discover curated itineraries, cultural insights, and
            local gems tailored to your travel vibe. Start mapping experiences
            that feel handpicked just for you.
          </p>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <button className="rounded-full bg-red-500 px-6 py-3 text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-red-600">
              Start Planning
            </button>
            <button className="rounded-full border border-zinc-300 px-6 py-3 text-zinc-700 transition-colors hover:border-red-500 hover:text-red-500 dark:border-zinc-700 dark:text-zinc-200">
              View Sample Trip
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50 p-10 text-center text-sm text-red-600 shadow-inner dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          Hero imagery coming soon — imagine breathtaking skylines, neon
          nights, and serene temples filling this space.
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Curated Highlights</h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Discover the must-see spots for every prefecture, curated by travel
            experts and locals alike.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Intuitive Planning</h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Drag, drop, and customize day-by-day itineraries tailored to your
            pace and interests.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Community Insights</h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Tap into tips from other travelers, including hidden eateries,
            seasonal festivals, and transport hacks.
          </p>
        </div>
      </section>
    </div>
  );
}
