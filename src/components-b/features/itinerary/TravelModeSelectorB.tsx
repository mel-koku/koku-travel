"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Footprints,
  TrainFront,
  Bus,
  Car,
  Bike,
  Navigation,
  Check,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import type { ItineraryTravelMode } from "@/types/itinerary";
import type { Coordinate, RoutingRequest } from "@/lib/routing/types";

type TravelModeOption = {
  mode: ItineraryTravelMode;
  label: string;
  Icon: LucideIcon;
};

const TRAVEL_MODES: TravelModeOption[] = [
  { mode: "walk", label: "Walk", Icon: Footprints },
  { mode: "car", label: "Drive", Icon: Car },
  { mode: "taxi", label: "Taxi", Icon: Car },
  { mode: "bus", label: "Bus", Icon: Bus },
  { mode: "train", label: "Train", Icon: TrainFront },
  { mode: "subway", label: "Subway", Icon: TrainFront },
  { mode: "transit", label: "Transit", Icon: TrainFront },
  { mode: "bicycle", label: "Bike", Icon: Bike },
];

type ModeEstimate = {
  mode: ItineraryTravelMode;
  durationMinutes: number;
  isLoading: boolean;
  error?: string;
};

type TravelModeSelectorBProps = {
  currentMode: ItineraryTravelMode;
  durationMinutes: number;
  departureTime?: string;
  origin: Coordinate;
  destination: Coordinate;
  timezone?: string;
  onModeChange: (mode: ItineraryTravelMode) => void;
};

export function TravelModeSelectorB({
  currentMode,
  durationMinutes,
  departureTime,
  origin,
  destination,
  timezone,
  onModeChange,
}: TravelModeSelectorBProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [estimates, setEstimates] = useState<Map<ItineraryTravelMode, ModeEstimate>>(
    new Map(),
  );
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEstimates((prev) => {
      const next = new Map(prev);
      if (!next.has(currentMode)) {
        next.set(currentMode, { mode: currentMode, durationMinutes, isLoading: false });
      }
      return next;
    });
  }, [currentMode, durationMinutes]);

  const fetchAllEstimates = useCallback(async () => {
    setIsLoadingAll(true);
    setEstimates((prev) => {
      const next = new Map(prev);
      TRAVEL_MODES.forEach((option) => {
        const existing = next.get(option.mode);
        if (!existing || existing.isLoading || existing.durationMinutes === 0) {
          next.set(option.mode, { mode: option.mode, durationMinutes: 0, isLoading: true });
        }
      });
      return next;
    });

    const fetchPromises = TRAVEL_MODES.map(async (option) => {
      try {
        const request: RoutingRequest = {
          origin,
          destination,
          mode: option.mode,
          departureTime,
          timezone,
        };
        const response = await fetch("/api/routing/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as {
          mode: ItineraryTravelMode;
          durationMinutes: number;
        };
        setEstimates((prev) => {
          const updated = new Map(prev);
          updated.set(option.mode, {
            mode: option.mode,
            durationMinutes: data.durationMinutes,
            isLoading: false,
          });
          return updated;
        });
      } catch (error) {
        setEstimates((prev) => {
          const updated = new Map(prev);
          updated.set(option.mode, {
            mode: option.mode,
            durationMinutes: 0,
            isLoading: false,
            error: error instanceof Error ? error.message : "Failed",
          });
          return updated;
        });
      }
    });

    await Promise.allSettled(fetchPromises);
    setIsLoadingAll(false);
  }, [origin, destination, departureTime, timezone]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    fetchAllEstimates();
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, fetchAllEstimates]);

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return "\u2014";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const currentOption = TRAVEL_MODES.find((m) => m.mode === currentMode);
  const CurrentIcon = currentOption?.Icon ?? Navigation;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <CurrentIcon className="h-3.5 w-3.5" />
        <span className="font-medium" style={{ color: "var(--foreground)" }}>
          {formatDuration(durationMinutes)}
        </span>
        <span className="text-xs">{currentOption?.label}</span>
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform"
          style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[min(14rem,90vw)] rounded-xl border p-1"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {TRAVEL_MODES.map((option) => {
            const estimate = estimates.get(option.mode);
            const isCurrentMode = currentMode === option.mode;
            const isEstimateLoading = estimate?.isLoading ?? false;
            const estimateDuration = estimate?.durationMinutes ?? 0;
            const hasEstimate = estimate && !isEstimateLoading && estimateDuration > 0;

            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => {
                  onModeChange(option.mode);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-xs transition-colors"
                style={{
                  backgroundColor: isCurrentMode
                    ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                    : "transparent",
                  color: isCurrentMode ? "var(--primary)" : "var(--foreground)",
                  fontWeight: isCurrentMode ? 600 : 400,
                }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <option.Icon className="h-4 w-4 shrink-0" />
                  <span className="capitalize">{option.label}</span>
                  {isEstimateLoading && (
                    <svg
                      className="h-3 w-3 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {hasEstimate && (
                    <span
                      className="text-[11px] font-medium"
                      style={{
                        color: isCurrentMode ? "var(--primary)" : "var(--muted-foreground)",
                      }}
                    >
                      {formatDuration(estimateDuration)}
                    </span>
                  )}
                  {isCurrentMode && <Check className="h-4 w-4 shrink-0" />}
                </div>
              </button>
            );
          })}
          {isLoadingAll && (
            <div
              className="px-2 py-1.5 text-center text-[11px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Loading route estimates...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
