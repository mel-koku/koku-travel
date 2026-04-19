"use client";

import type { ComponentProps } from "react";
import { TripAdvisoriesTray } from "@/components/features/itinerary/chapter/TripAdvisoriesTray";
import { SlideDrawer } from "./SlideDrawer";

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
  return (
    <SlideDrawer open={open} onClose={onClose} title="Trip advisories">
      <TripAdvisoriesTray {...trayProps} />
    </SlideDrawer>
  );
}
