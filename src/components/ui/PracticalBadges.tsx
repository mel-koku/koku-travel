"use client";

import { memo, useMemo } from "react";
import type { Location } from "@/types/location";
import { getOpenStatus, formatOpenStatus } from "@/lib/availability/isOpenNow";
import { derivePaymentPill } from "@/lib/payments/paymentPill";
import { deriveDietaryPills } from "@/lib/dietary/dietaryPills";

type PracticalBadgesProps = {
  location: Location;
  /** Show open/closed status (uses current time) */
  showOpenStatus?: boolean;
  /** Compact variant for overlay cards (white text, smaller) */
  variant?: "default" | "overlay";
  /** Max number of badges to show */
  max?: number;
  /** Include the nearest-station badge. Off when the host card renders its own. */
  showStation?: boolean;
};

/**
 * Inline practical intel badges for location cards.
 * Surfaces cashOnly, nearestStation, reservationInfo, and open/closed status.
 */
export const PracticalBadges = memo(function PracticalBadges({
  location,
  showOpenStatus = true,
  variant = "default",
  max = 4,
  showStation = true,
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

  // Payment acceptance (supersedes the legacy cashOnly-only branch).
  const paymentPill = derivePaymentPill(location);
  if (paymentPill) {
    badges.push({
      key: "payment",
      icon: paymentPill.label === "Cash only" ? <CashIcon /> : <CardIcon />,
      label: paymentPill.label,
      tone: paymentPill.tone,
    });
  }

  // Dietary pills (Halal / Vegan friendly / Gluten-free / Vegetarian friendly).
  // Up to 2 pills, priority-sorted with vegan-subsumes-vegetarian rule.
  // Gated internally to restaurant/cafe/bar categories; helper returns [] otherwise.
  for (const pill of deriveDietaryPills(location)) {
    badges.push({
      key: `dietary-${pill.flag}`,
      icon: <LeafIcon />,
      label: pill.label,
      tone: pill.tone,
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
  if (showStation && location.nearestStation) {
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

// Single shared icon for all four dietary pills. Deliberately NOT using a
// crescent for Halal or per-flag iconography — Yuku is a secular travel
// product, not a certification body. A neutral leaf reads as "dietary info"
// and lets the label carry the specific claim. Do not "fix" this to be
// per-flag without reading the spec.
function LeafIcon() {
  return (
    <svg
      className="h-2.5 w-2.5 shrink-0"
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        d="M13 3c0 5-3 8-8 9-1-5 2-8 8-9z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 5L5 11" strokeLinecap="round" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4v8M6 5.5h3a1.5 1.5 0 010 3H6.5a1.5 1.5 0 000 3H10" strokeLinecap="round" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <path d="M2 7h12" strokeLinecap="round" />
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
