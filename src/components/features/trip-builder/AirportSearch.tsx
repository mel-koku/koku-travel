"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { durationFast, easeReveal } from "@/lib/motion";
import type { Airport } from "@/app/api/airports/route";

export type AirportSearchProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filteredAirports: Airport[];
  topAirports: Airport[];
  onSelectAirport: (airport: Airport) => void;
  placeholder?: string;
  popularLabel?: string;
  noResultsText?: string;
  accentColor?: "sage" | "brand-primary";
  popularLabelClassName?: string;
};

export function AirportSearch({
  searchQuery,
  onSearchQueryChange,
  filteredAirports,
  topAirports,
  onSelectAirport,
  placeholder = "Search by name, city, or code...",
  popularLabel = "Popular airports",
  noResultsText = "No airports found",
  accentColor = "sage",
  popularLabelClassName = "mb-2 mt-3",
}: AirportSearchProps) {
  return (
    <>
      {/* Search input */}
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-md border border-border bg-background pl-10 pr-10 text-base placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-stone hover:text-foreground-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      <AnimatePresence>
        {searchQuery && filteredAirports.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: durationFast, ease: easeReveal }}
            className="overflow-hidden"
          >
            <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-background">
              {filteredAirports.map((airport) => (
                <button
                  key={airport.id}
                  type="button"
                  onClick={() => onSelectAirport(airport)}
                  className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left hover:bg-surface"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{airport.name}</p>
                    <p className="text-xs text-stone">{airport.city}</p>
                  </div>
                  <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-stone">
                    {airport.iataCode}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {searchQuery && filteredAirports.length === 0 && (
        <p className="mt-2 text-center text-sm text-stone">{noResultsText}</p>
      )}

      {/* Popular airports grid */}
      {!searchQuery && (
        <>
          <p className={`${popularLabelClassName} text-xs font-medium uppercase tracking-wide text-stone`}>
            {popularLabel}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {topAirports.map((airport) => (
              <button
                key={airport.id}
                type="button"
                onClick={() => onSelectAirport(airport)}
                className={cn(
                  "group flex cursor-pointer flex-col rounded-lg border p-3 text-left transition-all",
                  accentColor === "sage"
                    ? "border-border bg-background hover:border-sage/30 hover:bg-sage/5"
                    : "border-border bg-background hover:border-brand-primary/20 hover:bg-brand-primary/5",
                )}
              >
                <span className="font-mono text-lg font-bold text-brand-primary">
                  {airport.iataCode}
                </span>
                <span className="mt-0.5 text-sm font-medium text-foreground">
                  {airport.shortName}
                </span>
                <span className="text-xs text-stone">{airport.city}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
