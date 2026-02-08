"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { StoredTrip } from "@/state/AppState";

type TripPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  trips: StoredTrip[];
  onSelectTrip: (tripId: string) => void;
  locationName: string;
};

export function TripPickerModal({
  isOpen,
  onClose,
  trips,
  onSelectTrip,
  locationName,
}: TripPickerModalProps) {
  const [selectedTripId, setSelectedTripId] = useState<string>(() => trips[0]?.id ?? "");

  const tripOptions = useMemo(
    () =>
      trips.map((trip) => ({
        value: trip.id,
        label: trip.name,
      })),
    [trips]
  );

  const handleAdd = () => {
    if (!selectedTripId) return;
    onSelectTrip(selectedTripId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add to trip"
      description={`Choose which trip to add "${locationName}" to.`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="trip-picker-select" className="text-sm font-medium text-foreground-secondary">
            Select trip
          </label>
          <Select
            id="trip-picker-select"
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            options={tripOptions}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleAdd} disabled={!selectedTripId}>
            Add to trip
          </Button>
        </div>
      </div>
    </Modal>
  );
}
