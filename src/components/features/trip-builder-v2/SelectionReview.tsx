"use client";

import { useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { INTEREST_CATEGORIES } from "@/data/interests";
import { cn } from "@/lib/cn";

export type SelectionReviewProps = {
  onEdit?: () => void;
};

export function SelectionReview({ onEdit }: SelectionReviewProps) {
  const { data } = useTripBuilder();

  const formattedDates = useMemo(() => {
    if (!data.dates.start) return null;

    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const start = formatter.format(new Date(data.dates.start));
    if (!data.dates.end) return start;

    const end = formatter.format(new Date(data.dates.end));
    return `${start} - ${end}`;
  }, [data.dates.start, data.dates.end]);

  const interestLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of INTEREST_CATEGORIES) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, []);

  const budgetLabel = useMemo(() => {
    const parts: string[] = [];

    if (data.budget?.level) {
      parts.push(
        data.budget.level.charAt(0).toUpperCase() + data.budget.level.slice(1)
      );
    }

    if (data.budget?.total) {
      parts.push(`¥${data.budget.total.toLocaleString()} total`);
    }

    if (data.budget?.perDay) {
      parts.push(`¥${data.budget.perDay.toLocaleString()}/day`);
    }

    return parts.length > 0 ? parts.join(" · ") : null;
  }, [data.budget]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Your Trip Summary</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Edit
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {/* Duration & Dates */}
        <ReviewRow
          label="Duration"
          value={
            data.duration
              ? `${data.duration} day${data.duration === 1 ? "" : "s"}`
              : "Not set"
          }
          isEmpty={!data.duration}
        />

        <ReviewRow
          label="Dates"
          value={formattedDates ?? "Not set"}
          isEmpty={!formattedDates}
        />

        {/* Entry Point */}
        <ReviewRow
          label="Entry Point"
          value={data.entryPoint?.name ?? "Not set"}
          isEmpty={!data.entryPoint}
        />

        {/* Budget */}
        <ReviewRow
          label="Budget"
          value={budgetLabel ?? "Not set"}
          isEmpty={!budgetLabel}
        />

        {/* Cities */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between">
            <span className="text-sm text-gray-500">Cities</span>
            <div className="flex-1 ml-4 text-right">
              {data.cities && data.cities.length > 0 ? (
                <div className="flex flex-wrap justify-end gap-1">
                  {data.cities.map((city) => (
                    <span
                      key={city}
                      className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">Not selected</span>
              )}
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between">
            <span className="text-sm text-gray-500">Interests</span>
            <div className="flex-1 ml-4 text-right">
              {data.interests && data.interests.length > 0 ? (
                <div className="flex flex-wrap justify-end gap-1">
                  {data.interests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                    >
                      {interestLabels.get(interest) ?? interest}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">Not selected</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ReviewRowProps = {
  label: string;
  value: string;
  isEmpty?: boolean;
};

function ReviewRow({ label, value, isEmpty }: ReviewRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={cn("text-sm font-medium", isEmpty ? "text-gray-400" : "text-gray-900")}
      >
        {value}
      </span>
    </div>
  );
}
