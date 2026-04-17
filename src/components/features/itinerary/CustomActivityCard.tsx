"use client";

import { useState } from "react";
import type { ItineraryActivity } from "@/types/itinerary";

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
    <div className="rounded border p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-semibold">{activity.title}</div>
            <div className="text-xs text-gray-500">
              {activity.schedule?.arrivalTime && <>{activity.schedule.arrivalTime} · </>}
              {formatDuration(activity.durationMin ?? 60)}
              {" · "}
              <span className="inline-block rounded bg-gray-200 px-1 text-[10px] font-medium uppercase">
                Custom
              </span>
            </div>
            {activity.address && (
              <div className="mt-1 truncate text-xs text-gray-600">{activity.address}</div>
            )}
            {addressless && (
              <div className="mt-1 text-xs text-amber-600">
                No address — times approximate
              </div>
            )}
            {activity.notes && !expanded && (
              <div className="mt-1 line-clamp-2 text-xs text-gray-700">{activity.notes}</div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasPhone && <span aria-label="phone">📞</span>}
            {hasWebsite && <span aria-label="website">🔗</span>}
            {hasCost && <span aria-label="cost">💴</span>}
            {overflow > 0 && <span className="text-xs text-gray-500">+{overflow}</span>}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-3 text-sm">
          {activity.notes && <div>{activity.notes}</div>}
          {activity.phone && (
            <a href={`tel:${activity.phone}`} className="block text-blue-600">
              📞 {activity.phone}
            </a>
          )}
          {activity.website && (
            <a
              href={activity.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600"
            >
              🔗 {activity.website}
            </a>
          )}
          {activity.costEstimate && (
            <div>
              💴 {activity.costEstimate.amount} {activity.costEstimate.currency}
            </div>
          )}
          {activity.confirmationNumber && (
            <div>Confirmation: {activity.confirmationNumber}</div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded border px-3 py-1 text-sm"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
