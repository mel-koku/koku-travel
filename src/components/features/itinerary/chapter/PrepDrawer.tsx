"use client";

import type { StoredTrip } from "@/services/trip/types";
import { PrepBanner } from "@/components/features/itinerary/PrepBanner";
import { SlideDrawer } from "./SlideDrawer";

export type PrepDrawerProps = {
  open: boolean;
  onClose: () => void;
  trip: StoredTrip;
};

export function PrepDrawer({ open, onClose, trip }: PrepDrawerProps) {
  return (
    <SlideDrawer open={open} onClose={onClose} title="Pre-trip checklist">
      <PrepBanner trip={trip} />
    </SlideDrawer>
  );
}
