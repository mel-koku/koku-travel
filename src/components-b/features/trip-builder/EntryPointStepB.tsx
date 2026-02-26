"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Search, X } from "lucide-react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { JAPAN_MAP_VIEWBOX, ALL_PREFECTURE_PATHS } from "@/data/japanMapPaths";
import { logger } from "@/lib/logger";
import type { EntryPoint, KnownRegionId } from "@/types/trip";
import type { Airport } from "@/app/api/airports/route";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
const TOP_AIRPORT_CODES = ["HND", "NRT", "KIX", "CTS", "FUK", "NGO"];

function coordsToSvg(lat: number, lng: number): { x: number; y: number } {
  return {
    x: 18.65 * lng - 2297.7,
    y: -23.49 * lat + 1087.4,
  };
}

export type EntryPointStepBProps = {
  sanityConfig?: TripBuilderConfig;
};

export function EntryPointStepB({ sanityConfig }: EntryPointStepBProps) {
  const { data, setData } = useTripBuilder();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchAirports() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/airports");
        if (!response.ok) throw new Error("Failed to fetch airports");
        const result = await response.json();
        setAirports(result.data || []);
      } catch (error) {
        logger.error(
          "Error fetching airports",
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchAirports();
  }, []);

  const handleSelectAirport = useCallback(
    (airport: Airport) => {
      const entryPoint: EntryPoint = {
        type: "airport",
        id: airport.id,
        name: airport.name,
        coordinates: airport.coordinates,
        iataCode: airport.iataCode,
        region: airport.region.toLowerCase() as KnownRegionId,
      };
      setData((prev) => ({ ...prev, entryPoint }));
      setSearchQuery("");
    },
    [setData],
  );

  const handleClear = useCallback(() => {
    setData((prev) => ({ ...prev, entryPoint: undefined }));
  }, [setData]);

  const topAirports = useMemo(() => {
    return TOP_AIRPORT_CODES.map((code) =>
      airports.find((a) => a.iataCode === code),
    ).filter((a): a is Airport => a !== undefined);
  }, [airports]);

  const filteredAirports = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return airports
      .filter(
        (airport) =>
          airport.name.toLowerCase().includes(query) ||
          airport.city.toLowerCase().includes(query) ||
          airport.iataCode.toLowerCase().includes(query) ||
          airport.shortName.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [airports, searchQuery]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Left — Japan map */}
      <div className="relative flex items-center justify-center overflow-hidden bg-[var(--surface)] px-8 py-8 lg:w-[60%]">
        <div className="relative w-full max-w-lg">
          <JapanMapB
            airports={airports}
            selectedAirport={data.entryPoint}
            onSelectAirport={handleSelectAirport}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Right — Airport selection */}
      <div className="flex flex-1 flex-col px-4 py-8 sm:px-6 lg:w-[40%] lg:justify-center lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
            Step 02
          </p>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
            className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl"
          >
            {sanityConfig?.entryPointHeading ?? "Where will you land?"}
          </motion.h2>

          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {sanityConfig?.entryPointDescription ??
              "Optional. If you know your airport, we\u2019ll route from there."}
          </p>

          {/* Selected airport */}
          <AnimatePresence mode="wait">
            {data.entryPoint && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-6 rounded-2xl bg-white p-4"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {data.entryPoint.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {data.entryPoint.iataCode}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                  >
                    Change
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search + grid */}
          {!data.entryPoint && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5"
            >
              {/* Search input */}
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    sanityConfig?.entryPointSearchPlaceholder ??
                    "Search by name, city, or code..."
                  }
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-10 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search results */}
              <AnimatePresence>
                {searchQuery && filteredAirports.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: bEase }}
                    className="overflow-hidden"
                  >
                    <div
                      className="mt-2 max-h-48 overflow-auto rounded-2xl bg-white"
                      style={{ boxShadow: "var(--shadow-card)" }}
                    >
                      {filteredAirports.map((airport) => (
                        <button
                          key={airport.id}
                          type="button"
                          onClick={() => handleSelectAirport(airport)}
                          className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface)]"
                        >
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {airport.name}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {airport.city}
                            </p>
                          </div>
                          <span className="rounded-lg bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                            {airport.iataCode}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {searchQuery && filteredAirports.length === 0 && (
                <p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
                  No airports found
                </p>
              )}

              {/* Popular airports grid */}
              {!searchQuery && (
                <>
                  <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                    Popular airports
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {topAirports.map((airport) => (
                      <button
                        key={airport.id}
                        type="button"
                        onClick={() => handleSelectAirport(airport)}
                        className="group flex cursor-pointer flex-col rounded-2xl bg-white p-3 text-left transition-all hover:shadow-[var(--shadow-elevated)]"
                        style={{ boxShadow: "var(--shadow-sm)" }}
                      >
                        <span className="text-lg font-bold text-[var(--primary)]">
                          {airport.iataCode}
                        </span>
                        <span className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
                          {airport.shortName}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {airport.city}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {isLoading && (
            <div className="mt-8 flex items-center gap-2 text-[var(--muted-foreground)]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
              <span className="text-sm">Loading airports...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Japan map SVG with airport markers — B palette.
 */
function JapanMapB({
  airports,
  selectedAirport,
  onSelectAirport,
  isLoading,
}: {
  airports: Airport[];
  selectedAirport?: EntryPoint;
  onSelectAirport: (airport: Airport) => void;
  isLoading: boolean;
}) {
  const topSet = useMemo(() => new Set(TOP_AIRPORT_CODES), []);
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <div
      className="relative h-full w-full"
      style={{ maxHeight: "calc(100dvh - 14rem)" }}
    >
      <svg
        ref={svgRef}
        viewBox={JAPAN_MAP_VIEWBOX}
        className="h-full w-full"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
      >
        {ALL_PREFECTURE_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="0.8"
            opacity="0.12"
          />
        ))}
        {!isLoading &&
          airports.map((airport) => {
            if (!airport.coordinates?.lat || !airport.coordinates?.lng)
              return null;
            const pos = coordsToSvg(
              airport.coordinates.lat,
              airport.coordinates.lng,
            );
            if (pos.x < 0 || pos.x > 438 || pos.y < 0 || pos.y > 516)
              return null;

            const isSelected =
              selectedAirport?.iataCode === airport.iataCode;
            const isTop = topSet.has(airport.iataCode);
            const showLabel = isSelected || isTop;

            return (
              <g key={airport.iataCode} className="cursor-pointer">
                {isSelected && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={12}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="1.5"
                    initial={{ r: 6, opacity: 0.6 }}
                    animate={{ r: 14, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={10}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onSelectAirport(airport)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${airport.name}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectAirport(airport);
                    }
                  }}
                />

                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? 5 : isTop ? 3.5 : 2}
                  fill={
                    isSelected
                      ? "var(--primary)"
                      : isTop
                        ? "var(--primary)"
                        : "var(--muted-foreground)"
                  }
                  opacity={isSelected ? 1 : isTop ? 0.8 : 0.4}
                  style={{ pointerEvents: "none" }}
                />

                {showLabel && (
                  <text
                    x={pos.x + (pos.x > 320 ? -8 : 10)}
                    y={pos.y + 3}
                    fill={
                      isSelected
                        ? "var(--primary)"
                        : "var(--muted-foreground)"
                    }
                    fontWeight={isSelected ? "bold" : "normal"}
                    fontSize="8"
                    fontFamily="var(--font-inter), system-ui, sans-serif"
                    textAnchor={pos.x > 320 ? "end" : "start"}
                    style={{ pointerEvents: "none" }}
                  >
                    {airport.iataCode}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
}
