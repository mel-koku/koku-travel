"use client";

import { useMemo } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { REGIONS } from "@/data/regions";

const CATS = ["culture", "food", "nature", "nightlife"] as const;

const LOCATIONS = REGIONS.flatMap((region) =>
  region.cities.map((city) => ({
    id: city.id,
    label: city.name,
  })),
);

export default function GuidesFilterBar({
  query,
  setQuery,
  category,
  setCategory,
  location,
  setLocation,
}: {
  query: string;
  setQuery: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
}) {
  const locationLabel = useMemo(() => {
    if (!location) return "All Locations";
    const loc = LOCATIONS.find((l) => l.id === location);
    return loc?.label || "All Locations";
  }, [location]);

  const locationItems = useMemo(
    () => [
      {
        id: "",
        label: "All Locations",
        onSelect: () => setLocation(""),
      },
      ...LOCATIONS.map((loc) => ({
        id: loc.id,
        label: loc.label,
        onSelect: () => setLocation(loc.id),
      })),
    ],
    [setLocation],
  );
  return (
    <aside className="sticky [top:var(--sticky-offset)] z-40 px-4 mt-2">
      <div
        className="
          mx-auto w-full max-w-4xl
          flex items-center gap-3
          rounded-2xl border border-gray-200 bg-white/90 backdrop-blur
          px-6 py-3 shadow-md hover:shadow-lg transition
        "
      >
        {/* search */}
        <div className="flex-1 relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔎
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides..."
            aria-label="Search guides"
            className="
              w-full h-10 rounded-full border border-gray-200
              bg-gray-50 text-gray-900 placeholder-gray-400
              pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
            "
          />
        </div>

        {/* location dropdown */}
        <div className="hidden md:block">
          <Dropdown
            label={locationLabel}
            items={locationItems}
            align="end"
            className="flex-shrink-0"
          />
        </div>

        {/* chips (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          {CATS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(category === cat ? "" : cat)}
              aria-pressed={category === cat}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition
                ${
                  category === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* icon button (visual parity with Explore) */}
        <button
          aria-label="Search"
          className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 rounded-full flex items-center justify-center transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"
            />
          </svg>
        </button>
      </div>

      {/* filters (mobile) */}
      <div className="mt-2 flex md:hidden gap-2 overflow-x-auto px-2">
        <div className="flex-shrink-0">
          <Dropdown
            label={locationLabel}
            items={locationItems}
            align="start"
          />
        </div>
        {CATS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(category === cat ? "" : cat)}
            aria-pressed={category === cat}
            className={`
              flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition
              ${
                category === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>
    </aside>
  );
}

