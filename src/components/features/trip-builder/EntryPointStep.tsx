"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Search, X } from "lucide-react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { cn } from "@/lib/cn";
import { durationFast, easeReveal } from "@/lib/motion";
import type { EntryPoint, KnownRegionId } from "@/types/trip";
import type { Airport } from "@/app/api/airports/route";
import { logger } from "@/lib/logger";
import { JAPAN_MAP_VIEWBOX, ALL_PREFECTURE_PATHS } from "@/data/japanMapPaths";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const TOP_AIRPORT_CODES = ["HND", "NRT", "KIX", "CTS", "FUK", "NGO"];

export type EntryPointStepProps = {
  sanityConfig?: TripBuilderConfig;
};

export function EntryPointStep({ sanityConfig }: EntryPointStepProps) {
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
        logger.error("Error fetching airports", error instanceof Error ? error : new Error(String(error)));
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
    [setData]
  );

  const handleClear = useCallback(() => {
    setData((prev) => ({ ...prev, entryPoint: undefined }));
  }, [setData]);

  const topAirports = useMemo(() => {
    return TOP_AIRPORT_CODES
      .map((code) => airports.find((a) => a.iataCode === code))
      .filter((a): a is Airport => a !== undefined);
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
          airport.shortName.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [airports, searchQuery]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Left (60%) — Japan map area with selected airport display */}
      <div className="relative flex items-center justify-center overflow-hidden bg-surface/30 px-8 py-8 lg:w-[60%]">
        <div className="relative w-full max-w-lg">
          {/* SVG Japan Map with airport markers */}
          <JapanSilhouette
            airports={airports}
            topAirportCodes={TOP_AIRPORT_CODES}
            selectedAirport={data.entryPoint}
            onSelectAirport={handleSelectAirport}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Right (40%) — Airport selection */}
      <div className="flex flex-1 flex-col px-6 py-8 lg:w-[40%] lg:justify-center lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-primary">
            STEP 02
          </p>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeReveal, delay: 0.15 }}
            className="mt-2 font-serif text-2xl italic tracking-tight text-foreground lg:text-3xl"
          >
            {sanityConfig?.entryPointHeading ?? "Where will you land?"}
          </motion.h2>

          <p className="mt-1 text-sm text-stone">
            {sanityConfig?.entryPointDescription ?? "Optional \u2014 helps us plan smarter routes from your arrival."}
          </p>

          {/* Selected airport display */}
          <AnimatePresence mode="wait">
            {data.entryPoint && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-6 rounded-xl border border-sage/30 bg-sage/5 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/20 text-sage">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{data.entryPoint.name}</p>
                      <p className="font-mono text-xs text-sage">{data.entryPoint.iataCode}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-lg px-4 py-2 text-xs text-stone hover:bg-surface hover:text-foreground-secondary"
                  >
                    {sanityConfig?.entryPointChangeText ?? "Change"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Airport search + cards grid */}
          {!data.entryPoint && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5"
            >
              {/* Search input — always visible above cards */}
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={sanityConfig?.entryPointSearchPlaceholder ?? "Search by name, city, or code..."}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-base placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
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
                    <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-border bg-background">
                      {filteredAirports.map((airport) => (
                        <button
                          key={airport.id}
                          type="button"
                          onClick={() => handleSelectAirport(airport)}
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
                <p className="mt-2 text-center text-sm text-stone">{sanityConfig?.entryPointNoResults ?? "No airports match that search"}</p>
              )}

              {/* Popular airports grid — shown when not searching */}
              {!searchQuery && (
                <>
                  <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-stone">
                    {sanityConfig?.entryPointPopularLabel ?? "Popular airports"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {topAirports.map((airport) => (
                      <button
                        key={airport.id}
                        type="button"
                        onClick={() => handleSelectAirport(airport)}
                        className={cn(
                          "group flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-all",
                          "border-border bg-background hover:border-sage/30 hover:bg-sage/5"
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
            </motion.div>
          )}

          {isLoading && (
            <div className="mt-8 flex items-center gap-2 text-stone">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
              <span className="text-sm">Loading airports...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Convert lat/lng to SVG viewBox coordinates (0 0 438 516).
 * Approximate linear transform calibrated against known airport positions.
 */
function coordsToSvg(lat: number, lng: number): { x: number; y: number } {
  return {
    x: 18.65 * lng - 2297.7,
    y: -23.49 * lat + 1087.4,
  };
}

/**
 * Japan silhouette SVG with ALL airport markers.
 */
type JapanSilhouetteProps = {
  airports: Airport[];
  topAirportCodes: string[];
  selectedAirport?: EntryPoint;
  onSelectAirport: (airport: Airport) => void;
  isLoading: boolean;
};

const BASE_VB = { x: 0, y: 0, w: 438, h: 516 };
const MAX_ZOOM = 3;

function JapanSilhouette({
  airports,
  topAirportCodes,
  selectedAirport,
  onSelectAirport,
  isLoading,
}: JapanSilhouetteProps) {
  const topSet = useMemo(() => new Set(topAirportCodes), [topAirportCodes]);
  const [hoveredAirport, setHoveredAirport] = useState<{ iataCode: string; name: string; x: number; y: number } | null>(null);

  // ── Zoom / pan (ref-based — no re-renders during interaction) ──
  const svgRef = useRef<SVGSVGElement>(null);
  const vb = useRef({ ...BASE_VB });
  const isPanning = useRef(false);
  const panOrigin = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const clampVB = useCallback(
    (x: number, y: number, w: number, h: number) => ({
      x: Math.max(0, Math.min(x, BASE_VB.w - w)),
      y: Math.max(0, Math.min(y, BASE_VB.h - h)),
      w,
      h,
    }),
    []
  );

  const applyVB = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const v = vb.current;
    svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
    const zoomed = v.w < BASE_VB.w - 1;
    svg.style.cursor = zoomed
      ? isPanning.current
        ? "grabbing"
        : "grab"
      : "";
  }, []);

  // Wheel zoom — { passive: false } to allow preventDefault
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
      let nw = vb.current.w * factor;
      let nh = vb.current.h * factor;
      if (nw >= BASE_VB.w) {
        nw = BASE_VB.w;
        nh = BASE_VB.h;
      }
      if (nw < BASE_VB.w / MAX_ZOOM) {
        nw = BASE_VB.w / MAX_ZOOM;
        nh = BASE_VB.h / MAX_ZOOM;
      }
      vb.current = clampVB(
        vb.current.x + (vb.current.w - nw) * mx,
        vb.current.y + (vb.current.h - nh) * my,
        nw,
        nh
      );
      applyVB();
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [clampVB, applyVB]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      isPanning.current = true;
      didDrag.current = false;
      panOrigin.current = { x: e.clientX, y: e.clientY };
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isPanning.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx =
        ((e.clientX - panOrigin.current.x) / rect.width) * vb.current.w;
      const dy =
        ((e.clientY - panOrigin.current.y) / rect.height) * vb.current.h;
      panOrigin.current = { x: e.clientX, y: e.clientY };
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag.current = true;
      vb.current = clampVB(
        vb.current.x - dx,
        vb.current.y - dy,
        vb.current.w,
        vb.current.h
      );
      applyVB();
    },
    [clampVB, applyVB]
  );

  const onPointerUp = useCallback(() => {
    isPanning.current = false;
    applyVB();
  }, [applyVB]);

  const onDblClick = useCallback(() => {
    vb.current = { ...BASE_VB };
    applyVB();
  }, [applyVB]);

  return (
    <div className="relative h-full w-full" style={{ maxHeight: "calc(100dvh - 14rem)" }}>
      <svg
        ref={svgRef}
        viewBox={JAPAN_MAP_VIEWBOX}
        className="h-full w-full"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDblClick}
      >
        {/* Proper Japan map — all prefecture outlines */}
        {ALL_PREFECTURE_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            className="text-foreground"
            opacity="0.15"
          />
        ))}
        {!isLoading &&
          airports.map((airport) => {
            if (!airport.coordinates?.lat || !airport.coordinates?.lng) return null;
            const pos = coordsToSvg(airport.coordinates.lat, airport.coordinates.lng);
            // Skip if outside viewBox bounds
            if (pos.x < 0 || pos.x > 438 || pos.y < 0 || pos.y > 516) return null;

            const isSelected = selectedAirport?.iataCode === airport.iataCode;
            const isTop = topSet.has(airport.iataCode);
            const showLabel = isSelected || isTop;

            return (
              <g key={airport.iataCode} className="cursor-pointer">
                {/* Pulse ring for selected */}
                {isSelected && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={12}
                    fill="none"
                    className="stroke-sage"
                    strokeWidth="1.5"
                    initial={{ r: 6, opacity: 0.6 }}
                    animate={{ r: 14, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                {/* Click target (larger invisible circle) */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={10}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => { if (!didDrag.current) onSelectAirport(airport); }}
                  onMouseEnter={() => setHoveredAirport({ iataCode: airport.iataCode, name: airport.shortName, x: pos.x, y: pos.y })}
                  onMouseLeave={() => setHoveredAirport(null)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${airport.name}`}
                />

                {/* Marker dot */}
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? 5 : isTop ? 3.5 : 2}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected
                      ? "fill-sage"
                      : isTop
                        ? "fill-brand-primary"
                        : "fill-brand-primary/50"
                  )}
                  whileHover={{ scale: 1.5 }}
                  style={{ pointerEvents: "none" }}
                />

                {/* IATA label — shown for top airports and selected */}
                {showLabel && (
                  <text
                    x={pos.x + (pos.x > 320 ? -8 : 10)}
                    y={pos.y + 3}
                    className={cn(
                      "pointer-events-none font-mono text-[8px]",
                      isSelected
                        ? "fill-sage font-bold"
                        : "fill-foreground-secondary"
                    )}
                    textAnchor={pos.x > 320 ? "end" : "start"}
                  >
                    {airport.iataCode}
                  </text>
                )}
              </g>
            );
          })}
        {hoveredAirport && selectedAirport?.iataCode !== hoveredAirport.iataCode && (
          <text
            x={hoveredAirport.x + (hoveredAirport.x > 320 ? -8 : 10)}
            y={hoveredAirport.y + (topSet.has(hoveredAirport.iataCode) ? 13 : 3)}
            className="pointer-events-none font-mono text-[8px] fill-foreground-secondary"
            textAnchor={hoveredAirport.x > 320 ? "end" : "start"}
          >
            {hoveredAirport.name}
          </text>
        )}
      </svg>
    </div>
  );
}
