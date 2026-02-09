"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ItineraryTravelMode } from "@/types/itinerary";
import type { Coordinate, RoutingRequest } from "@/lib/routing/types";
import { cn } from "@/lib/cn";

type TravelModeOption = {
  mode: ItineraryTravelMode;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
};

const TRAVEL_MODES: TravelModeOption[] = [
  { mode: "walk", label: "Walk", icon: "🚶", color: "text-blue-700", bgColor: "bg-blue-50" },
  { mode: "car", label: "Drive", icon: "🚗", color: "text-gray-700", bgColor: "bg-gray-50" },
  { mode: "taxi", label: "Taxi", icon: "🚕", color: "text-yellow-700", bgColor: "bg-yellow-50" },
  { mode: "bus", label: "Bus", icon: "🚌", color: "text-green-700", bgColor: "bg-green-50" },
  { mode: "train", label: "Train", icon: "🚆", color: "text-indigo-700", bgColor: "bg-indigo-50" },
  { mode: "subway", label: "Subway", icon: "🚇", color: "text-purple-700", bgColor: "bg-purple-50" },
  { mode: "transit", label: "Transit", icon: "🚊", color: "text-teal-700", bgColor: "bg-teal-50" },
  { mode: "bicycle", label: "Bike", icon: "🚲", color: "text-orange-700", bgColor: "bg-orange-50" },
];

type ModeEstimate = {
  mode: ItineraryTravelMode;
  durationMinutes: number;
  isLoading: boolean;
  error?: string;
};

type TravelModeSelectorProps = {
  currentMode: ItineraryTravelMode;
  durationMinutes: number;
  departureTime?: string;
  arrivalTime?: string;
  origin: Coordinate;
  destination: Coordinate;
  timezone?: string;
  onModeChange: (mode: ItineraryTravelMode) => void;
};

export function TravelModeSelector({
  currentMode,
  durationMinutes,
  departureTime,
  arrivalTime: _arrivalTime,
  origin,
  destination,
  timezone,
  onModeChange,
}: TravelModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [estimates, setEstimates] = useState<Map<ItineraryTravelMode, ModeEstimate>>(new Map());
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize current mode estimate
  useEffect(() => {
    setEstimates((prev) => {
      const next = new Map(prev);
      if (!next.has(currentMode)) {
        next.set(currentMode, {
          mode: currentMode,
          durationMinutes,
          isLoading: false,
        });
      }
      return next;
    });
  }, [currentMode, durationMinutes]);

  // Fetch estimates for all modes when dropdown opens
  const fetchAllEstimates = useCallback(async () => {
    setIsLoadingAll(true);
    
    // Use functional update to get current estimates without including in deps
    setEstimates((prevEstimates) => {
      const newEstimates = new Map(prevEstimates);
      
      // Mark all modes as loading initially
      TRAVEL_MODES.forEach((option) => {
        const existing = newEstimates.get(option.mode);
        // Only mark as loading if we don't have a valid estimate
        if (!existing || existing.isLoading || existing.durationMinutes === 0) {
          newEstimates.set(option.mode, {
            mode: option.mode,
            durationMinutes: 0,
            isLoading: true,
          });
        }
      });
      
      return newEstimates;
    });

    // Fetch routes for all modes in parallel via API
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

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as {
          mode: ItineraryTravelMode;
          durationMinutes: number;
          distanceMeters?: number;
        };

        // Update estimate for this mode
        setEstimates((prevEstimates) => {
          const updated = new Map(prevEstimates);
          updated.set(option.mode, {
            mode: option.mode,
            durationMinutes: data.durationMinutes,
            isLoading: false,
          });
          return updated;
        });
      } catch (error) {
        // Update estimate with error for this mode
        setEstimates((prevEstimates) => {
          const updated = new Map(prevEstimates);
          updated.set(option.mode, {
            mode: option.mode,
            durationMinutes: 0,
            isLoading: false,
            error: error instanceof Error ? error.message : "Failed to fetch route",
          });
          return updated;
        });
      }
    });

    await Promise.allSettled(fetchPromises);
    setIsLoadingAll(false);
  }, [origin, destination, departureTime, timezone]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Fetch estimates when dropdown opens
      fetchAllEstimates();
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, fetchAllEstimates]);

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return "—";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDurationWithMode = (minutes: number, mode: ItineraryTravelMode) => {
    const duration = formatDuration(minutes);
    const modeOption = TRAVEL_MODES.find((m) => m.mode === mode);
    const icon = modeOption?.icon ?? "";
    const label = modeOption?.label ?? "";
    return duration === "—" ? duration : `${icon} ${duration} ${label}`;
  };

  const _formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.ceil(meters)} meters`;
    const km = (meters / 1000).toFixed(1);
    return `${km}km`;
  };
  void _formatDistance; // Intentionally unused - kept for future use

  const getEstimate = (mode: ItineraryTravelMode): ModeEstimate | undefined => {
    return estimates.get(mode);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="font-mono">{formatDurationWithMode(durationMinutes, currentMode)}</span>
        <svg
          className={cn("h-4 w-4 transition-transform text-stone", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-background shadow-lg ring-1 ring-black/5">
          <div className="p-1">
            {TRAVEL_MODES.map((option) => {
              const estimate = getEstimate(option.mode);
              const isCurrentMode = currentMode === option.mode;
              const isEstimateLoading = estimate?.isLoading ?? false;
              const estimateDuration = estimate?.durationMinutes ?? 0;
              const hasEstimate = estimate && !isEstimateLoading && estimateDuration > 0;

              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => {
                    // Change mode - this will trigger a recalculation in ItineraryShell
                    onModeChange(option.mode);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                    isCurrentMode
                      ? `${option.bgColor} ${option.color} font-semibold`
                      : "text-foreground-secondary hover:bg-surface",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{option.icon}</span>
                    <span className="capitalize flex-shrink-0">{option.label}</span>
                    {isEstimateLoading && (
                      <svg
                        className="h-3 w-3 animate-spin text-stone"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
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
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {hasEstimate && (
                      <span className={cn("font-mono text-[11px] font-medium", isCurrentMode ? option.color : "text-stone")}>
                        {formatDuration(estimateDuration)}
                      </span>
                    )}
                    {isCurrentMode && (
                      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
            {isLoadingAll && (
              <div className="px-2 py-1.5 text-[11px] text-stone text-center">
                Loading route estimates...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

