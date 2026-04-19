"use client";

import type { ComponentProps } from "react";
import { TripAdvisoriesTray } from "@/components/features/itinerary/chapter/TripAdvisoriesTray";

export type TripAdvisoriesDrawerProps = {
  open: boolean;
  onClose: () => void;
  trayProps: ComponentProps<typeof TripAdvisoriesTray>;
};

export function TripAdvisoriesDrawer({
  open,
  onClose,
  trayProps,
}: TripAdvisoriesDrawerProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-charcoal/40"
      onClick={onClose}
      role="presentation"
    >
      <aside
        role="dialog"
        aria-label="Trip advisories"
        className="fixed right-0 top-0 h-[100dvh] w-full max-w-[560px] bg-background overflow-y-auto shadow-[var(--shadow-elevated)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium">Trip advisories</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-foreground-secondary"
          >
            Close ✕
          </button>
        </header>
        <TripAdvisoriesTray {...trayProps} />
      </aside>
    </div>
  );
}
