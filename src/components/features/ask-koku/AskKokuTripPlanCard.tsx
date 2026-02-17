"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, MapPin, Sparkles, Zap } from "lucide-react";
import { setLocal } from "@/lib/storageHelpers";
import { TRIP_BUILDER_STORAGE_KEY } from "@/lib/constants/storage";
import { vibesToInterests } from "@/data/vibes";
import type { TripBuilderData, VibeId, TripStyle } from "@/types/trip";

export type TripPlanData = {
  plan: {
    startDate?: string;
    endDate?: string;
    duration?: number;
    cities: string[];
    regions: string[];
    vibes: VibeId[];
    style?: TripStyle;
    entryAirport?: string;
  };
  unknownCities: string[];
  cityNames: string[];
  vibeNames: string[];
};

type AskKokuTripPlanCardProps = {
  data: TripPlanData;
  onClose?: () => void;
};

function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!endDate) return fmt(start);
  const end = new Date(endDate + "T00:00:00");
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatDuration(duration?: number, startDate?: string, endDate?: string): string {
  if (duration) return `${duration} day${duration !== 1 ? "s" : ""}`;
  if (startDate && endDate) {
    const diff = Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diff > 0) return `${diff} day${diff !== 1 ? "s" : ""}`;
  }
  return "";
}

const STYLE_LABELS: Record<TripStyle, string> = {
  relaxed: "Relaxed pace",
  balanced: "Balanced pace",
  fast: "Packed schedule",
};

export function AskKokuTripPlanCard({ data, onClose }: AskKokuTripPlanCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { plan, cityNames, vibeNames } = data;

  const dateRange = formatDateRange(plan.startDate, plan.endDate);
  const duration = formatDuration(plan.duration, plan.startDate, plan.endDate);
  const dateDisplay = dateRange
    ? duration
      ? `${dateRange} (${duration})`
      : dateRange
    : duration || null;

  const handleStartPlanning = useCallback(() => {
    // Build TripBuilderData from the plan
    const tripData: TripBuilderData = {
      dates: {
        start: plan.startDate,
        end: plan.endDate,
      },
      duration: plan.duration,
      cities: plan.cities,
      regions: plan.regions,
      vibes: plan.vibes,
      interests: vibesToInterests(plan.vibes),
      style: plan.style,
    };

    // Write to localStorage
    setLocal(TRIP_BUILDER_STORAGE_KEY, tripData);

    if (pathname === "/trip-builder") {
      // Already on trip builder — dispatch event for in-page update
      window.dispatchEvent(
        new CustomEvent("koku:trip-plan-from-chat", { detail: tripData }),
      );
    } else {
      // Navigate to trip builder at Review step
      router.push("/trip-builder?step=5");
    }

    // Close the chat panel
    onClose?.();
  }, [plan, pathname, router, onClose]);

  return (
    <div className="mt-2 rounded-xl border border-sage/30 bg-sage/5 p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
        Your Trip
      </p>

      <div className="space-y-2">
        {dateDisplay && (
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <Calendar className="h-4 w-4 shrink-0 text-foreground-secondary" />
            <span>{dateDisplay}</span>
          </div>
        )}

        {cityNames.length > 0 && (
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-foreground-secondary" />
            <span>{cityNames.join(", ")}</span>
          </div>
        )}

        {vibeNames.length > 0 && (
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <Sparkles className="h-4 w-4 shrink-0 text-foreground-secondary" />
            <span>{vibeNames.join(", ")}</span>
          </div>
        )}

        {plan.style && (
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <Zap className="h-4 w-4 shrink-0 text-foreground-secondary" />
            <span>{STYLE_LABELS[plan.style]}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleStartPlanning}
        className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-brand-primary text-sm font-medium text-white transition-transform active:scale-[0.98]"
      >
        Start Planning
      </button>
    </div>
  );
}
