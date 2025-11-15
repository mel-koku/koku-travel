import type { Location } from "@/types/location";

type EnhancedLocation = Location & {
  budgetValue: number | null;
  durationMinutes: number | null;
  tags: string[];
  ratingValue: number | null;
};

type FeaturedLocationsHeroProps = {
  locations: EnhancedLocation[];
};

export function FeaturedLocationsHero({ locations }: FeaturedLocationsHeroProps) {
  if (locations.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-stone-200/50 bg-gradient-to-br from-stone-50/80 via-slate-50/70 to-stone-100/80 backdrop-blur-xl px-8 py-12 shadow-lg shadow-stone-900/5 focus-within:outline-none focus-within:ring-2 focus-within:ring-stone-300/30">
      <div className="relative z-10 flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-stone-600">
          Featured Picks
        </span>
        <h1 className="text-3xl font-semibold leading-tight text-stone-900 sm:text-4xl md:text-5xl">
          Discover our handpicked spots across Japan
        </h1>
        <p className="max-w-2xl text-base text-stone-700 sm:text-lg">
          Start your next itinerary with the places travelers love right now—from timeless
          temples to vibrant city nights.
        </p>
      </div>
      <div className="relative z-10 mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <article
            key={location.id}
            className="group overflow-hidden rounded-2xl border border-stone-200/40 bg-white/40 backdrop-blur-md transition-all hover:border-stone-300/60 hover:bg-white/60 hover:shadow-lg"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-slate-800 transition-transform duration-500 group-hover:scale-105"
                style={
                  location.image
                    ? {
                        backgroundImage: `url(${location.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/0" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">
                  {location.city}, {location.region}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{location.name}</h3>
              </div>
            </div>
            <p className="px-5 pb-5 pt-4 text-sm text-stone-700">
              {getHeroSummary(location)}
            </p>
          </article>
        ))}
      </div>
      <div
        className="absolute -top-20 right-[-10%] h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 left-[-6%] h-56 w-56 rounded-full bg-stone-300/15 blur-3xl"
        aria-hidden="true"
      />
    </section>
  );
}

function getHeroSummary(location: EnhancedLocation): string {
  const candidates = [
    location.shortDescription?.trim(),
    location.recommendedVisit?.summary?.trim(),
  ].filter((value): value is string => Boolean(value && value.length > 0));

  const fallback = `Plan a visit to ${location.name} in ${location.city}.`;

  if (candidates.length > 0) {
    const text = candidates[0];
    if (!text) return fallback;
    return text.length > 140 ? `${text.slice(0, 137)}…` : text;
  }

  return fallback;
}

