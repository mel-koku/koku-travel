"use client";

import type { ComponentProps } from "react";
import { TripConfidenceDashboard } from "@/components/features/itinerary/TripConfidenceDashboard";
import { SlideDrawer } from "./SlideDrawer";

export type TripOverviewDrawerProps = {
  open: boolean;
  onClose: () => void;
  dashboardProps: ComponentProps<typeof TripConfidenceDashboard>;
};

export function TripOverviewDrawer({
  open,
  onClose,
  dashboardProps,
}: TripOverviewDrawerProps) {
  return (
    <SlideDrawer open={open} onClose={onClose} title="Trip overview">
      <TripConfidenceDashboard {...dashboardProps} />
    </SlideDrawer>
  );
}
