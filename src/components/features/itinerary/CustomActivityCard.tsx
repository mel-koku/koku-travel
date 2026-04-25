"use client";

import { useState } from "react";
import { Phone, Link as LinkIcon, Banknote } from "lucide-react";
import type { ItineraryActivity } from "@/types/itinerary";
import { isSafeUrl } from "@/lib/utils/urlSafety";

type Props = {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  onEdit: () => void;
  onDelete: () => void;
};

function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${min} min`;
}

export function CustomActivityCard({ activity, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasPhone = Boolean(activity.phone);
  const hasWebsite = Boolean(activity.website);
  const hasCost = Boolean(activity.costEstimate);
  const hasConfirmation = Boolean(activity.confirmationNumber);
  const filledCount = [hasPhone, hasWebsite, hasCost, hasConfirmation].filter(Boolean).length;
  const shownIcons = [hasPhone, hasWebsite, hasCost].filter(Boolean).length;
  const overflow = filledCount - shownIcons;
  const addressless = !activity.coordinates;

  return (
    <div className="rounded-md border border-border p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-semibold text-foreground">{activity.title}</div>
            <div className="text-xs text-foreground-secondary">
              {activity.schedule?.arrivalTime && <>{activity.schedule.arrivalTime} · </>}
              {formatDuration(activity.durationMin ?? 60)}
              {" · "}
              <span className="inline-block rounded bg-sand px-1 text-[10px] font-medium uppercase text-foreground-secondary">
                Custom
              </span>
            </div>
            {activity.address && (
              <div className="mt-1 truncate text-xs text-foreground-secondary">{activity.address}</div>
            )}
            {addressless && (
              <div className="mt-1 text-xs text-warning">
                No address. Times approximate.
              </div>
            )}
            {activity.notes && !expanded && (
              <div className="mt-1 line-clamp-2 text-xs text-foreground/80">{activity.notes}</div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasPhone && <Phone className="h-3.5 w-3.5 text-foreground-secondary" aria-label="phone" />}
            {hasWebsite && <LinkIcon className="h-3.5 w-3.5 text-foreground-secondary" aria-label="website" />}
            {hasCost && <Banknote className="h-3.5 w-3.5 text-foreground-secondary" aria-label="cost" />}
            {overflow > 0 && <span className="text-xs text-foreground-secondary">+{overflow}</span>}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
          {activity.notes && <div className="text-foreground">{activity.notes}</div>}
          {activity.phone && (
            <a href={`tel:${activity.phone}`} className="flex items-center gap-2 text-accent">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {activity.phone}
            </a>
          )}
          {activity.website && isSafeUrl(activity.website) && (
            <a
              href={activity.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-accent"
            >
              <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {activity.website}
            </a>
          )}
          {activity.costEstimate && (
            <div className="flex items-center gap-2 text-foreground">
              <Banknote className="h-3.5 w-3.5 text-foreground-secondary" aria-hidden="true" />
              {activity.costEstimate.amount} {activity.costEstimate.currency}
            </div>
          )}
          {activity.confirmationNumber && (
            <div className="text-foreground">Confirmation: {activity.confirmationNumber}</div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md border border-border px-3 py-1 text-sm text-foreground hover:bg-canvas"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md border border-error/40 px-3 py-1 text-sm text-error hover:bg-nasu-tint"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
