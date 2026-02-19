"use client";

import { memo, useMemo } from "react";
import type { Location } from "@/types/location";
import { getOpenStatus, formatOpenStatus } from "@/lib/availability/isOpenNow";

type PracticalBadgesProps = {
  location: Location;
  /** Show open/closed status (uses current time) */
  showOpenStatus?: boolean;
  /** Compact variant for overlay cards (white text, smaller) */
  variant?: "default" | "overlay";
  /** Max number of badges to show */
  max?: number;
};

/**
 * Inline practical intel badges for location cards.
 * Surfaces cashOnly, nearestStation, reservationInfo, and open/closed status.
 */
export const PracticalBadges = memo(function PracticalBadges({
  location,
  showOpenStatus = true,
  variant = "default",
  max = 3,
}: PracticalBadgesProps) {
  const openLabel = useMemo(() => {
    if (!showOpenStatus) return null;
    const status = getOpenStatus(location.operatingHours);
    return formatOpenStatus(status);
  }, [location.operatingHours, showOpenStatus]);

  const openState = useMemo(() => {
    if (!showOpenStatus) return null;
    return getOpenStatus(location.operatingHours);
  }, [location.operatingHours, showOpenStatus]);

  const badges: { key: string; icon: React.ReactNode; label: string; tone: "neutral" | "warning" | "success" | "error" }[] = [];

  // Cash only
  if (location.cashOnly) {
    badges.push({
      key: "cash",
      icon: <CashIcon />,
      label: "Cash only",
      tone: "warning",
    });
  }

  // Price level
  if (location.priceLevel && location.priceLevel > 0) {
    badges.push({
      key: "price",
      icon: <PriceIcon />,
      label: "¥".repeat(location.priceLevel),
      tone: "neutral",
    });
  }

  // Nearest station (truncate to station name only if too long)
  if (location.nearestStation) {
    const station = location.nearestStation.length > 28
      ? location.nearestStation.slice(0, 26) + "…"
      : location.nearestStation;
    badges.push({
      key: "station",
      icon: <TrainIcon />,
      label: station,
      tone: "neutral",
    });
  }

  // Reservation info
  if (location.reservationInfo) {
    badges.push({
      key: "reservation",
      icon: <ReservationIcon />,
      label: location.reservationInfo === "required" ? "Reservation required" : "Reservations recommended",
      tone: location.reservationInfo === "required" ? "warning" : "neutral",
    });
  }

  // Open/closed status
  if (openLabel && openState) {
    badges.push({
      key: "hours",
      icon: <ClockIcon />,
      label: openLabel,
      tone: openState.state === "open" ? "success" : "error",
    });
  }

  if (badges.length === 0) return null;

  const visible = badges.slice(0, max);
  const isOverlay = variant === "overlay";

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] leading-tight font-medium ${
            isOverlay
              ? "bg-charcoal/60 text-white/80 backdrop-blur-sm"
              : toneClasses[badge.tone]
          }`}
        >
          {badge.icon}
          {badge.label}
        </span>
      ))}
    </div>
  );
});

const toneClasses = {
  neutral: "bg-sand/40 text-foreground-secondary",
  warning: "bg-warning/10 text-warning",
  success: "bg-sage/10 text-sage",
  error: "bg-error/10 text-error",
} as const;

function CashIcon() {
  return (
    <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4v8M6 5.5h3a1.5 1.5 0 010 3H6.5a1.5 1.5 0 000 3H10" strokeLinecap="round" />
    </svg>
  );
}

function TrainIcon() {
  return (
    <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="2" width="8" height="10" rx="2" />
      <circle cx="6.5" cy="9.5" r="0.75" fill="currentColor" />
      <circle cx="9.5" cy="9.5" r="0.75" fill="currentColor" />
      <path d="M6 5h4M5 14l1.5-2h3L11 14" strokeLinecap="round" />
    </svg>
  );
}

function ReservationIcon() {
  return (
    <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
      <path d="M3 6h10M6 3v3M10 3v3" strokeLinecap="round" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5v7M6 6.5h3.5a1.25 1.25 0 010 2.5H6" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
    </svg>
  );
}
