"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, PlaneLanding, Search, X, Clock, ClipboardPaste, Check } from "lucide-react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { JAPAN_MAP_VIEWBOX, ALL_PREFECTURE_PATHS } from "@/data/japanMapPaths";
import { logger } from "@/lib/logger";
import type { EntryPoint, KnownRegionId } from "@/types/trip";
import type { Airport } from "@/app/api/airports/route";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import { computeEffectiveArrivalStart, computeEffectiveDepartureEnd } from "@/lib/utils/airportBuffer";
import { formatTime12h } from "@/lib/utils/timeUtils";
import { parseFlightDetails, formatParsedFlight } from "@/lib/utils/flightParser";
import { TimePickerB } from "@b/ui/TimePickerB";

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
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exitSearchQuery, setExitSearchQuery] = useState("");
  const [showFlightPaste, setShowFlightPaste] = useState(false);
  const [flightPasteText, setFlightPasteText] = useState("");
  const [flightParseMessage, setFlightParseMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAirports = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(false);
      const response = await fetch("/api/airports");
      if (!response.ok) throw new Error("Failed to fetch airports");
      const result = await response.json();
      setAirports(result.data || []);
    } catch (error) {
      logger.error(
        "Error fetching airports",
        error instanceof Error ? error : new Error(String(error)),
      );
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAirports();
  }, [fetchAirports]);

  const handleSelectAirport = useCallback(
    (airport: Airport) => {
      const entryPoint: EntryPoint = {
        type: "airport",
        id: airport.id,
        name: airport.name,
        coordinates: airport.coordinates,
        iataCode: airport.iataCode,
        cityId: airport.city.toLowerCase(),
        region: airport.region.toLowerCase() as KnownRegionId,
      };
      setData((prev) => ({ ...prev, entryPoint }));
      setSearchQuery("");
    },
    [setData],
  );

  const handleClear = useCallback(() => {
    setData((prev) => ({ ...prev, entryPoint: undefined, exitPoint: undefined, sameAsEntry: undefined, arrivalTime: undefined, departureTime: undefined }));
  }, [setData]);

  const handleArrivalTimeChange = useCallback(
    (time: string | undefined) => {
      setData((prev) => ({ ...prev, arrivalTime: time }));
    },
    [setData],
  );

  const handleDepartureTimeChange = useCallback(
    (time: string | undefined) => {
      setData((prev) => ({ ...prev, departureTime: time }));
    },
    [setData],
  );

  const handleSelectExitAirport = useCallback(
    (airport: Airport) => {
      const exitPoint: EntryPoint = {
        type: "airport",
        id: airport.id,
        name: airport.name,
        coordinates: airport.coordinates,
        iataCode: airport.iataCode,
        cityId: airport.city.toLowerCase(),
        region: airport.region.toLowerCase() as KnownRegionId,
      };
      setData((prev) => ({ ...prev, exitPoint, sameAsEntry: false }));
      setExitSearchQuery("");
    },
    [setData],
  );

  const handleToggleSameAsEntry = useCallback(
    (same: boolean) => {
      setData((prev) => ({
        ...prev,
        sameAsEntry: same,
        exitPoint: same ? undefined : prev.exitPoint,
      }));
      setExitSearchQuery("");
    },
    [setData],
  );

  const handleClearExit = useCallback(() => {
    setData((prev) => ({ ...prev, exitPoint: undefined, sameAsEntry: false }));
  }, [setData]);

  const handleFlightParse = useCallback(() => {
    if (!flightPasteText.trim()) return;
    const result = parseFlightDetails(flightPasteText, airports);
    const parts: string[] = [];

    if (result.arrival) {
      if (result.arrival.iataCode) {
        const matchedAirport = airports.find((a) => a.iataCode === result.arrival!.iataCode);
        if (matchedAirport) handleSelectAirport(matchedAirport);
      }
      if (result.arrival.time) {
        setData((prev) => ({ ...prev, arrivalTime: result.arrival!.time }));
      }
      if (result.arrival.airline || result.arrival.flightNumber) {
        setData((prev) => ({
          ...prev,
          flightDetails: {
            ...prev.flightDetails,
            arrival: { airline: result.arrival!.airline, flightNumber: result.arrival!.flightNumber },
          },
        }));
      }
      parts.push(formatParsedFlight(result.arrival, "arrival"));
    }

    if (result.departure) {
      if (result.departure.time) {
        setData((prev) => ({ ...prev, departureTime: result.departure!.time }));
      }
      if (result.departure.iataCode && result.departure.iataCode !== result.arrival?.iataCode) {
        const exitAirport = airports.find((a) => a.iataCode === result.departure!.iataCode);
        if (exitAirport) handleSelectExitAirport(exitAirport);
      }
      if (result.departure.airline || result.departure.flightNumber) {
        setData((prev) => ({
          ...prev,
          flightDetails: {
            ...prev.flightDetails,
            departure: { airline: result.departure!.airline, flightNumber: result.departure!.flightNumber },
          },
        }));
      }
      parts.push(formatParsedFlight(result.departure, "departure"));
    }

    if (parts.length > 0) {
      setFlightParseMessage({ type: "success", text: `Found: ${parts.join(" | ")}` });
      setShowFlightPaste(false);
      setFlightPasteText("");
    } else {
      setFlightParseMessage({ type: "error", text: "Couldn\u2019t detect flight info. Try entering manually." });
    }
  }, [flightPasteText, airports, handleSelectAirport, handleSelectExitAirport, setData]);

  const arrivalHint = useMemo(() => {
    const effective = computeEffectiveArrivalStart(data.arrivalTime, data.entryPoint?.iataCode);
    if (!effective) return null;
    const hh = Number(effective.split(":")[0]);
    if (hh >= 20) return "Day 1 is arrival day — grab dinner and settle in";
    if (hh >= 18) return "Just enough time for dinner near your hotel";
    return `First activity starts around ${formatTime12h(effective)}`;
  }, [data.arrivalTime, data.entryPoint?.iataCode]);

  const departureHint = useMemo(() => {
    const exitIata = data.sameAsEntry !== false
      ? data.entryPoint?.iataCode
      : (data.exitPoint?.iataCode ?? data.entryPoint?.iataCode);
    const effective = computeEffectiveDepartureEnd(data.departureTime, exitIata);
    if (!effective) return null;
    return formatTime12h(effective);
  }, [data.departureTime, data.entryPoint?.iataCode, data.exitPoint?.iataCode, data.sameAsEntry]);

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

  const filteredExitAirports = useMemo(() => {
    if (!exitSearchQuery.trim()) return [];
    const query = exitSearchQuery.toLowerCase();
    return airports
      .filter(
        (airport) =>
          airport.name.toLowerCase().includes(query) ||
          airport.city.toLowerCase().includes(query) ||
          airport.iataCode.toLowerCase().includes(query) ||
          airport.shortName.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [airports, exitSearchQuery]);

  const sameAsEntry = data.sameAsEntry !== false;

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Left — Japan map */}
      <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden bg-[var(--surface)] px-4 py-6 sm:px-8 sm:py-8 lg:min-h-0 lg:w-[60%]">
        <div className="relative w-full max-w-lg">
          <JapanMapB
            airports={airports}
            selectedAirport={data.entryPoint}
            selectedExitAirport={!sameAsEntry ? data.exitPoint : undefined}
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

                {/* Arrival time */}
                <div className="mt-3 flex items-center gap-3 border-t border-[var(--border)] pt-3">
                  <Clock className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  <div className="flex flex-1 items-center gap-2">
                    <label className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">Landing at</label>
                    <TimePickerB
                      value={data.arrivalTime}
                      onChange={handleArrivalTimeChange}
                      placeholder="Set time"
                    />
                    {data.arrivalTime && (
                      <button
                        type="button"
                        onClick={() => setData((prev) => ({ ...prev, arrivalTime: undefined }))}
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {arrivalHint && (
                  <p className="mt-1.5 pl-7 text-xs text-[var(--primary)]">
                    {arrivalHint}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Departure airport section */}
          <AnimatePresence>
            {data.entryPoint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: bEase }}
                className="overflow-hidden"
              >
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                    Departure
                  </p>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleSameAsEntry(true)}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        sameAsEntry
                          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
                          : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-[var(--primary)]/20 hover:text-[var(--foreground)]"
                      }`}
                    >
                      Same airport
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSameAsEntry(false)}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        !sameAsEntry
                          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
                          : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-[var(--primary)]/20 hover:text-[var(--foreground)]"
                      }`}
                    >
                      Different airport
                    </button>
                  </div>

                  <AnimatePresence>
                    {!sameAsEntry && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: bEase }}
                        className="overflow-hidden"
                      >
                        {data.exitPoint ? (
                          <div
                            className="mt-3 rounded-2xl bg-white p-4"
                            style={{ boxShadow: "var(--shadow-card)" }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                                  <PlaneLanding className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium text-[var(--foreground)]">
                                    {data.exitPoint.name}
                                  </p>
                                  <p className="text-xs text-[var(--muted-foreground)]">
                                    {data.exitPoint.iataCode}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleClearExit}
                                className="rounded-xl px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                              >
                                Change
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <div className="relative">
                              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                                <Search className="h-4 w-4" />
                              </div>
                              <input
                                type="text"
                                value={exitSearchQuery}
                                onChange={(e) => setExitSearchQuery(e.target.value)}
                                placeholder="Search departure airport..."
                                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-10 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                              />
                              {exitSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setExitSearchQuery("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            <AnimatePresence>
                              {exitSearchQuery && filteredExitAirports.length > 0 && (
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
                                    {filteredExitAirports.map((airport) => (
                                      <button
                                        key={airport.id}
                                        type="button"
                                        onClick={() => handleSelectExitAirport(airport)}
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

                            {exitSearchQuery && filteredExitAirports.length === 0 && (
                              <p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
                                No airports found
                              </p>
                            )}

                            {!exitSearchQuery && (
                              <>
                                <p className="mb-2 mt-3 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                                  Popular airports
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {topAirports.map((airport) => (
                                    <button
                                      key={airport.id}
                                      type="button"
                                      onClick={() => handleSelectExitAirport(airport)}
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
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Departure time */}
                  <div className="mt-4 flex items-center gap-3">
                    <Clock className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    <div className="flex flex-1 items-center gap-2">
                      <label className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">Departing at</label>
                      <TimePickerB
                        value={data.departureTime}
                        onChange={handleDepartureTimeChange}
                        placeholder="Set time"
                      />
                      {data.departureTime && (
                        <button
                          type="button"
                          onClick={() => setData((prev) => ({ ...prev, departureTime: undefined }))}
                          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  {departureHint && (
                    <p className="mt-1.5 pl-7 text-xs text-[var(--primary)]">
                      Last activity wraps up around {departureHint}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flight paste + Search + grid */}
          {!data.entryPoint && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5"
            >
              {/* Paste flight details */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFlightPaste((v) => !v);
                    setFlightParseMessage(null);
                  }}
                  className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  {showFlightPaste ? "Hide" : "Or paste your flight details"}
                </button>

                <AnimatePresence>
                  {showFlightPaste && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: bEase }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2">
                        <textarea
                          value={flightPasteText}
                          onChange={(e) => {
                            setFlightPasteText(e.target.value);
                            setFlightParseMessage(null);
                          }}
                          placeholder={"e.g. NH203 NRT 14:30\nor: Landing Narita 2:30 PM, Departing KIX 18:00"}
                          rows={3}
                          className="w-full resize-none rounded-xl border border-[var(--border)] bg-white p-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                          style={{ boxShadow: "var(--shadow-sm)" }}
                        />
                        <button
                          type="button"
                          onClick={handleFlightParse}
                          disabled={!flightPasteText.trim()}
                          className="mt-2 rounded-xl bg-[var(--primary)]/10 px-4 py-2 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Auto-fill
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {flightParseMessage && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`mt-2 text-xs ${
                        flightParseMessage.type === "success"
                          ? "flex items-center gap-1 text-[var(--primary)]"
                          : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {flightParseMessage.type === "success" && <Check className="h-3.5 w-3.5" />}
                      {flightParseMessage.text}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

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

          {fetchError && !isLoading && airports.length === 0 && (
            <div className="mt-8 flex items-center gap-2">
              <span className="text-sm text-[var(--error)]">Couldn&apos;t load airports.</span>
              <button
                type="button"
                onClick={fetchAirports}
                className="text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const BASE_VB = { x: 0, y: 0, w: 438, h: 516 };
const MAX_ZOOM = 3;
const ZOOM_LABEL_THRESHOLD = 1.4; // Show all IATA codes at 1.4x+ zoom

/**
 * Japan map SVG with airport markers — B palette.
 * Supports wheel-zoom, pan, and reveals all IATA codes when zoomed in.
 */
function JapanMapB({
  airports,
  selectedAirport,
  selectedExitAirport,
  onSelectAirport,
  isLoading,
}: {
  airports: Airport[];
  selectedAirport?: EntryPoint;
  selectedExitAirport?: EntryPoint;
  onSelectAirport: (airport: Airport) => void;
  isLoading: boolean;
}) {
  const topSet = useMemo(() => new Set(TOP_AIRPORT_CODES), []);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const isZoomedRef = useRef(false);

  // ── Zoom / pan (ref-based to avoid re-renders during interaction) ──
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
    [],
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
    // Reveal all IATA labels when zoomed past threshold
    const nowZoomed = v.w < BASE_VB.w / ZOOM_LABEL_THRESHOLD;
    if (nowZoomed !== isZoomedRef.current) {
      isZoomedRef.current = nowZoomed;
      setIsZoomed(nowZoomed);
    }
  }, []);

  // Wheel zoom
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
      if (nw >= BASE_VB.w) { nw = BASE_VB.w; nh = BASE_VB.h; }
      if (nw < BASE_VB.w / MAX_ZOOM) { nw = BASE_VB.w / MAX_ZOOM; nh = BASE_VB.h / MAX_ZOOM; }
      vb.current = clampVB(
        vb.current.x + (vb.current.w - nw) * mx,
        vb.current.y + (vb.current.h - nh) * my,
        nw,
        nh,
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
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isPanning.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - panOrigin.current.x) / rect.width) * vb.current.w;
      const dy = ((e.clientY - panOrigin.current.y) / rect.height) * vb.current.h;
      panOrigin.current = { x: e.clientX, y: e.clientY };
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag.current = true;
      vb.current = clampVB(
        vb.current.x - dx,
        vb.current.y - dy,
        vb.current.w,
        vb.current.h,
      );
      applyVB();
    },
    [clampVB, applyVB],
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDblClick}
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
            const isExitSelected =
              selectedExitAirport?.iataCode === airport.iataCode;
            const isTop = topSet.has(airport.iataCode);
            const showLabel = isSelected || isExitSelected || isTop || isZoomed;

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

                {isExitSelected && !isSelected && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={12}
                    fill="none"
                    stroke="var(--accent, var(--primary))"
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
                  onClick={() => { if (!didDrag.current) onSelectAirport(airport); }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${airport.name}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!didDrag.current) onSelectAirport(airport);
                    }
                  }}
                />

                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected || isExitSelected ? 5 : isTop ? 3.5 : 2}
                  fill={
                    isSelected
                      ? "var(--primary)"
                      : isExitSelected
                        ? "var(--accent, var(--primary))"
                        : isTop
                          ? "var(--primary)"
                          : "var(--muted-foreground)"
                  }
                  opacity={isSelected || isExitSelected ? 1 : isTop ? 0.8 : 0.4}
                  style={{ pointerEvents: "none" }}
                />

                {showLabel && (
                  <text
                    x={pos.x + (pos.x > 320 ? -8 : 10)}
                    y={pos.y + 3}
                    fill={
                      isSelected
                        ? "var(--primary)"
                        : isExitSelected
                          ? "var(--accent, var(--primary))"
                          : "var(--muted-foreground)"
                    }
                    fontWeight={isSelected || isExitSelected ? "bold" : "normal"}
                    fontSize="8"
                    fontFamily="var(--font-inter), system-ui, sans-serif"
                    textAnchor={pos.x > 320 ? "end" : "start"}
                    className="cursor-pointer"
                    onClick={() => { if (!didDrag.current) onSelectAirport(airport); }}
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
