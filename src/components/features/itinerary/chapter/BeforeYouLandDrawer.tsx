"use client";

import { BeforeYouLandTab } from "@/components/features/itinerary/before-you-land/BeforeYouLandTab";
import type { CulturalBriefing } from "@/types/culturalBriefing";

export type BeforeYouLandDrawerProps = {
  open: boolean;
  onClose: () => void;
  briefing: CulturalBriefing | null | undefined;
};

export function BeforeYouLandDrawer({
  open,
  onClose,
  briefing,
}: BeforeYouLandDrawerProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-charcoal/40"
      onClick={onClose}
      role="presentation"
    >
      <aside
        role="dialog"
        aria-label="Before you land"
        className="fixed right-0 top-0 h-[100dvh] w-full max-w-[560px] bg-background overflow-y-auto shadow-[var(--shadow-elevated)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium">Before you land</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-foreground-secondary"
            aria-label="Close"
          >
            Close ✕
          </button>
        </header>
        {briefing ? (
          <BeforeYouLandTab briefing={briefing} />
        ) : (
          <p className="py-4 text-sm text-foreground-secondary">
            We haven&apos;t prepared a cultural briefing for this trip yet.
          </p>
        )}
      </aside>
    </div>
  );
}
