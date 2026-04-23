"use client";

import { type ReactNode } from "react";
import { MapPin } from "lucide-react";
import { DropdownMenu } from "./DropdownMenu";

export type TripBarProps = {
  tripName: string;
  currentDayIndex: number;
  totalDays: number;
  isToday: boolean;
  unreadAdvisories: number;
  unlockedPill?: ReactNode;
  onShare?: () => void;
  onDownloadPdf?: () => void;
  onOpenAdvisories?: () => void;
  onNearMe?: () => void;
};

export function TripBar({
  tripName,
  currentDayIndex,
  totalDays,
  isToday,
  unreadAdvisories,
  unlockedPill,
  onShare,
  onDownloadPdf,
  onOpenAdvisories,
  onNearMe,
}: TripBarProps) {
  const counter = isToday
    ? `Day ${currentDayIndex + 1} of ${totalDays} · Today`
    : `Day ${currentDayIndex + 1} of ${totalDays}`;

  const dropdownItems = [
    ...(onShare ? [{ label: "Share", onClick: onShare }] : [{ label: "Share", onClick: () => {} }]),
    ...(onDownloadPdf ? [{ label: "Download PDF", onClick: onDownloadPdf }] : [{ label: "Download PDF", onClick: () => {} }]),
    {
      label: `Advisories${unreadAdvisories > 0 ? ` (${unreadAdvisories})` : ""}`,
      onClick: onOpenAdvisories ?? (() => {}),
    },
  ];

  return (
    <div className="flex items-center justify-between py-3 px-6 border-b border-border text-xs uppercase tracking-[0.15em] text-foreground-secondary">
      <div className="flex items-center gap-2">
        <span>{tripName} · {counter}</span>
        {unlockedPill && <span className="normal-case tracking-normal">{unlockedPill}</span>}
      </div>
      <div className="flex items-center gap-6 normal-case tracking-normal text-sm">
        {onNearMe && (
          <button
            type="button"
            onClick={onNearMe}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20 active:scale-[0.98]"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Near Me
          </button>
        )}
        <DropdownMenu
          ariaLabel="More trip actions"
          align="right"
          trigger={
            <button
              type="button"
              className="relative text-foreground"
              aria-label="More"
            >
              ⋯
              {unreadAdvisories > 0 && (
                <span className="absolute -top-1 -right-2 h-4 w-4 rounded-full bg-brand-primary text-[10px] text-white flex items-center justify-center">
                  {unreadAdvisories}
                </span>
              )}
            </button>
          }
          items={dropdownItems}
        />
      </div>
    </div>
  );
}
