"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, MapPin, Sparkles, Zap } from "lucide-react";
import { setLocal } from "@/lib/storageHelpers";
import { TRIP_BUILDER_STORAGE_KEY } from "@/lib/constants/storage";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import type { TripPlanData } from "@/components/features/ask-koku/AskKokuTripPlanCard";
import type { TripBuilderData, TripStyle } from "@/types/trip";

type AskKokuTripPlanCardProps = {
  data: TripPlanData;
  onClose?: () => void;
};

function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate) return null;
  const start = parseLocalDate(startDate);
  if (!start) return null;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!endDate) return fmt(start);
  const end = parseLocalDate(endDate);
  if (!end) return null;
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatDuration(duration?: number, startDate?: string, endDate?: string): string {
  if (duration) return `${duration} day${duration !== 1 ? "s" : ""}`;
  if (startDate && endDate) {
    const s = parseLocalDate(startDate);
    const e = parseLocalDate(endDate);
    if (s && e) {
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) return `${diff} day${diff !== 1 ? "s" : ""}`;
    }
  }
  return "";
}

const STYLE_LABELS: Record<TripStyle, string> = {
  relaxed: "Relaxed pace",
  balanced: "Balanced pace",
  fast: "Packed schedule",
};

export function AskKokuTripPlanCardB({ data, onClose }: AskKokuTripPlanCardProps) {
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
    const tripData: TripBuilderData = {
      dates: {
        start: plan.startDate,
        end: plan.endDate,
      },
      duration: plan.duration,
      cities: plan.cities,
      regions: plan.regions,
      vibes: plan.vibes,
      style: plan.style,
    };

    setLocal(TRIP_BUILDER_STORAGE_KEY, tripData);

    if (pathname === "/b/trip-builder") {
      window.dispatchEvent(
        new CustomEvent("koku:trip-plan-from-chat", { detail: tripData }),
      );
    } else {
      router.push("/b/trip-builder?step=5");
    }

    onClose?.();
  }, [plan, pathname, router, onClose]);

  return (
    <div className="mt-2 rounded-xl bg-[var(--accent)] p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">
        Your Trip
      </p>

      <div className="space-y-2">
        {dateDisplay && (
          <div className="flex items-center gap-2.5 text-sm text-[var(--foreground)]">
            <Calendar className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            <span>{dateDisplay}</span>
          </div>
        )}

        {cityNames.length > 0 && (
          <div className="flex items-center gap-2.5 text-sm text-[var(--foreground)]">
            <MapPin className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            <span>{cityNames.join(", ")}</span>
          </div>
        )}

        {vibeNames.length > 0 && (
          <div className="flex items-center gap-2.5 text-sm text-[var(--foreground)]">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            <span>{vibeNames.join(", ")}</span>
          </div>
        )}

        {plan.style && (
          <div className="flex items-center gap-2.5 text-sm text-[var(--foreground)]">
            <Zap className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            <span>{STYLE_LABELS[plan.style]}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleStartPlanning}
        className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
      >
        Build My Trip
      </button>
    </div>
  );
}
