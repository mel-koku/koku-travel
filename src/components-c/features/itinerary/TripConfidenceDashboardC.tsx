"use client";

import { memo, useMemo, useState, useCallback } from "react";
import { X, Copy, Check, Printer } from "lucide-react";
import type { Itinerary } from "@/types/itinerary";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import type { TripBuilderData } from "@/types/trip";
import {
  calculateTripHealth,
  getHealthLevel,
  formatItineraryForExport,
  type ChecklistItem,
} from "@/lib/itinerary/tripHealth";

type TripConfidenceDashboardCProps = {
  itinerary: Itinerary;
  conflicts: ItineraryConflict[];
  tripStartDate?: string;
  selectedDay?: number;
  onClose: () => void;
  onSelectDay?: (dayIndex: number) => void;
  onDayExpand?: (dayIndex: number | null) => void;
  budgetTotal?: number;
  tripBuilderData?: TripBuilderData;
};

export const TripConfidenceDashboardC = memo(function TripConfidenceDashboardC({
  itinerary,
  conflicts,
  tripStartDate: _tripStartDate,
  selectedDay: _selectedDay,
  onClose,
  onSelectDay,
  onDayExpand: _onDayExpand,
  budgetTotal: _budgetTotal,
  tripBuilderData: _tripBuilderData,
}: TripConfidenceDashboardCProps) {
  const [copied, setCopied] = useState(false);

  const health = useMemo(
    () => calculateTripHealth(itinerary, conflicts),
    [itinerary, conflicts],
  );

  const healthLevel = getHealthLevel(health.overall);

  const handleCopyItinerary = useCallback(async () => {
    const text = formatItineraryForExport(itinerary);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [itinerary]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const healthColor =
    healthLevel === "good"
      ? "var(--success)"
      : healthLevel === "fair"
        ? "var(--warning)"
        : "var(--error)";

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center border-2 text-xl font-bold"
            style={{
              borderColor: healthColor,
              color: healthColor,
              fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
            }}
          >
            {health.overall}
          </div>
          <div>
            <h3
              className="text-sm font-bold uppercase tracking-[0.1em]"
              style={{ color: "var(--foreground)" }}
            >
              Trip Health
            </h3>
            <p
              className="text-xs capitalize"
              style={{ color: healthColor }}
            >
              {healthLevel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] active:scale-[0.98]"
          style={{ color: "var(--muted-foreground)" }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0">
        {[
          { label: "Days", value: itinerary.days.length },
          {
            label: "Activities",
            value: itinerary.days.reduce(
              (sum, d) => sum + d.activities.filter((a) => a.kind === "place").length,
              0,
            ),
          },
          { label: "Issues", value: conflicts.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border p-3 text-center"
            style={{ borderColor: "var(--border)" }}
          >
            <p
              className="text-lg font-bold"
              style={{
                color: "var(--foreground)",
                fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
              }}
            >
              {stat.value}
            </p>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Checklist */}
      {health.checklist.length > 0 && (
        <div className="space-y-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Checklist
          </p>
          <div className="space-y-0">
            {health.checklist.map((item: ChecklistItem) => (
              <div
                key={item.id}
                className="flex items-center gap-2 border-b py-2"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center border"
                  style={{ borderColor: "var(--warning)" }}
                >
                  <span className="text-[8px]" style={{ color: "var(--warning)" }}>!</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs" style={{ color: "var(--foreground)" }}>
                    {item.label}
                  </span>
                  <span className="ml-1 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    (Day {item.dayIndex + 1})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day-by-day overview */}
      <div className="space-y-1">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Per Day
        </p>
        <div className="space-y-0">
          {itinerary.days.map((day, i) => {
            const dayConflicts = conflicts.filter((c) => c.dayId === day.id);
            const placeCount = day.activities.filter((a) => a.kind === "place").length;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => onSelectDay?.(i)}
                className="flex w-full items-center justify-between border-b px-2 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] active:scale-[0.99]"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-xs font-bold" style={{ color: "var(--foreground)" }}>
                  Day {i + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    {placeCount} {placeCount === 1 ? "stop" : "stops"}
                  </span>
                  {dayConflicts.length > 0 && (
                    <span
                      className="border px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        borderColor: "var(--warning)",
                        color: "var(--warning)",
                      }}
                    >
                      {dayConflicts.length}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopyItinerary}
          className="flex h-11 flex-1 items-center justify-center gap-2 border text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-[0.98]"
          style={{
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Text"}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex h-11 flex-1 items-center justify-center gap-2 border text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-[0.98]"
          style={{
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>
    </div>
  );
});
