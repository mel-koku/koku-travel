"use client";

import { BeforeYouLandTab } from "@/components/features/itinerary/before-you-land/BeforeYouLandTab";
import type { CulturalBriefing } from "@/types/culturalBriefing";
import { SlideDrawer } from "./SlideDrawer";

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
  return (
    <SlideDrawer open={open} onClose={onClose} title="Before you land">
      {briefing ? (
        <BeforeYouLandTab briefing={briefing} />
      ) : (
        <p className="py-4 text-sm text-foreground-secondary">
          We haven&apos;t prepared a cultural briefing for this trip yet.
        </p>
      )}
    </SlideDrawer>
  );
}
