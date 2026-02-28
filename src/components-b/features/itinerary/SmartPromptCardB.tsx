"use client";

import {
  BookOpen,
  CalendarCheck,
  Clock,
  CloudRain,
  Coffee,
  Info,
  Leaf,
  Loader2,
  Moon,
  Plus,
  ShoppingBag,
  Shuffle,
  Sunrise,
  Sunset,
  Train,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  CalendarCheck,
  Clock,
  CloudRain,
  Coffee,
  Info,
  Leaf,
  Moon,
  Plus,
  ShoppingBag,
  Shuffle,
  Sunrise,
  Sunset,
  Train,
  Utensils,
  UtensilsCrossed,
};

export type SmartPromptCardBProps = {
  gap: DetectedGap;
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  isLoading?: boolean;
  flat?: boolean;
  className?: string;
};

export function SmartPromptCardB({
  gap,
  onAccept,
  onSkip,
  isLoading = false,
  flat = false,
  className,
}: SmartPromptCardBProps) {
  const Icon = ICON_MAP[gap.icon] ?? Plus;
  const isGuidance = gap.action.type === "acknowledge_guidance";
  const isReservation = gap.action.type === "acknowledge_reservation";
  const isLunchRush = gap.action.type === "acknowledge_lunch_rush";
  const isWeatherSwap = gap.action.type === "swap_for_weather";
  const isAcknowledge = isGuidance || isReservation || isLunchRush;

  return (
    <div
      className={cn(
        "relative overflow-hidden p-4",
        flat
          ? "border-b last:border-b-0"
          : "rounded-2xl bg-[var(--card)]",
        className,
      )}
      style={{
        borderColor: flat ? "var(--border)" : undefined,
        boxShadow: flat ? undefined : "var(--shadow-card)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: "var(--primary)" }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {gap.title}
            </h4>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
            >
              Day {gap.dayIndex + 1}
            </span>
          </div>

          <p
            className="mt-1 text-xs leading-relaxed line-clamp-2"
            style={{ color: "var(--muted-foreground)" }}
          >
            {gap.description}
          </p>

          {/* Reservation alert: location list */}
          {isReservation && gap.action.type === "acknowledge_reservation" && (
            <ul className="mt-1.5 space-y-0.5">
              {gap.action.locations.map((loc, i) => (
                <li key={i} className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <span className="font-medium" style={{ color: "var(--foreground)" }}>{loc.name}</span>
                  {" — Day "}
                  {loc.dayIndex + 1}
                  {loc.reservationInfo === "required" ? " (required)" : " (recommended)"}
                </li>
              ))}
            </ul>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            {isAcknowledge ? (
              <button
                type="button"
                onClick={() => onAccept(gap)}
                className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors duration-200 hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                Got it
              </button>
            ) : isWeatherSwap ? (
              <>
                <button
                  type="button"
                  onClick={() => onAccept(gap)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium text-[var(--card)] transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--primary)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Swapping...
                    </>
                  ) : (
                    "Swap"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSkip(gap)}
                  disabled={isLoading}
                  className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors duration-200 hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:opacity-60"
                >
                  Keep
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onAccept(gap)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium text-[var(--card)] transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--primary)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSkip(gap)}
                  disabled={isLoading}
                  className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors duration-200 hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:opacity-60"
                >
                  Skip
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
