"use client";

import {
  BookOpen,
  CalendarCheck,
  Clock,
  CloudRain,
  Coffee,
  Gift,
  Info,
  Leaf,
  Loader2,
  Moon,
  Package,
  PartyPopper,
  Plus,
  ShoppingBag,
  Shuffle,
  Sunrise,
  Sunset,
  Train,
  Users,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, CalendarCheck, Clock, CloudRain, Coffee, Gift, Info, Leaf,
  Moon, Package, PartyPopper, Plus, ShoppingBag, Shuffle, Sunrise, Sunset,
  Train, Users, Utensils, UtensilsCrossed,
};

export type SmartPromptCardCProps = {
  gap: DetectedGap;
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  isLoading?: boolean;
  flat?: boolean;
  className?: string;
};

export function SmartPromptCardC({
  gap,
  onAccept,
  onSkip,
  isLoading = false,
  flat = false,
  className,
}: SmartPromptCardCProps) {
  const Icon = ICON_MAP[gap.icon] ?? Plus;
  const isGuidance = gap.action.type === "acknowledge_guidance";
  const isReservation = gap.action.type === "acknowledge_reservation";
  const isLunchRush = gap.action.type === "acknowledge_lunch_rush";
  const isLuggage = gap.action.type === "acknowledge_luggage";
  const isCrowd = gap.action.type === "acknowledge_crowd";
  const isFestivalAck = gap.action.type === "acknowledge_festival";
  const isOmiyage = gap.action.type === "acknowledge_omiyage";
  const isLateArrival = gap.action.type === "acknowledge_late_arrival";
  const isWeatherSwap = gap.action.type === "swap_for_weather";
  const isBrowseExperts = gap.action.type === "browse_experts";
  const isAcknowledge = isGuidance || isReservation || isLunchRush || isLuggage || isCrowd || isFestivalAck || isOmiyage || isLateArrival;

  return (
    <div
      className={`relative overflow-hidden p-4 ${
        flat
          ? "border-b last:border-b-0"
          : "border"
      } ${className ?? ""}`}
      style={{
        borderColor: "var(--border)",
        backgroundColor: flat ? "transparent" : "var(--card)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center border"
          style={{
            borderColor: "var(--primary)",
            backgroundColor: "color-mix(in srgb, var(--primary) 5%, transparent)",
          }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: "var(--primary)" }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className="text-sm font-bold tracking-[-0.02em]"
              style={{ color: "var(--foreground)" }}
            >
              {gap.title}
            </h4>
            <span
              className="shrink-0 whitespace-nowrap border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{
                borderColor: "var(--primary)",
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
                  <span className="font-bold" style={{ color: "var(--foreground)" }}>{loc.name}</span>
                  {" - Day "}
                  {loc.dayIndex + 1}
                  {loc.reservationInfo === "required" ? " (required)" : " (recommended)"}
                </li>
              ))}
            </ul>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            {isBrowseExperts ? (
              <>
                <button
                  type="button"
                  onClick={() => onAccept(gap)}
                  className="h-8 px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-all active:scale-[0.98]"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  Browse experts
                </button>
                <button
                  type="button"
                  onClick={() => onSkip(gap)}
                  className="h-8 px-4 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Skip
                </button>
              </>
            ) : isAcknowledge ? (
              <button
                type="button"
                onClick={() => onAccept(gap)}
                className="h-8 px-4 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
                style={{ color: "var(--muted-foreground)" }}
              >
                Got it
              </button>
            ) : isWeatherSwap ? (
              <>
                <button
                  type="button"
                  onClick={() => onAccept(gap)}
                  disabled={isLoading}
                  className="inline-flex h-8 items-center gap-1.5 px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: "var(--primary)" }}
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
                  className="h-8 px-4 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] disabled:opacity-60"
                  style={{ color: "var(--muted-foreground)" }}
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
                  className="inline-flex h-8 items-center gap-1.5 px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: "var(--primary)" }}
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
                  className="h-8 px-4 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] disabled:opacity-60"
                  style={{ color: "var(--muted-foreground)" }}
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
