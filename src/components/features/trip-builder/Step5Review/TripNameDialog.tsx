"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { useAppState } from "@/state/AppState";
import { generateItineraryFromTrip } from "@/lib/itineraryGenerator";
import type { TripBuilderData } from "@/types/trip";
import { logger } from "@/lib/logger";

type TripNameDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  suggestedTripName: string;
  data: TripBuilderData;
};

export function TripNameDialog({
  isOpen,
  onClose,
  suggestedTripName,
  data,
}: TripNameDialogProps) {
  const { reset } = useTripBuilder();
  const { createTrip } = useAppState();
  const router = useRouter();
  const [tripName, setTripName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const trimmed = tripName.trim();
      setTripName(trimmed.length > 0 ? trimmed : suggestedTripName);
      setNameError(null);
    }
  }, [isOpen, suggestedTripName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTripNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTripName(event.target.value);
      if (nameError) {
        setNameError(null);
      }
    },
    [nameError],
  );

  const handleSubmitTripName = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSaving) {
        return;
      }
      const trimmed = tripName.trim();
      const finalName = trimmed.length > 0 ? trimmed : suggestedTripName;
      if (finalName.length === 0) {
        setNameError("Please enter a name for your itinerary.");
        return;
      }
      setIsSaving(true);
      try {
        const builderSnapshot = JSON.parse(JSON.stringify(data)) as TripBuilderData;
        const itinerary = generateItineraryFromTrip(builderSnapshot);
        const tripId = createTrip({
          name: finalName,
          itinerary,
          builderData: builderSnapshot,
        });
        setTripName(finalName);
        reset();
        onClose();
        setNameError(null);
        router.push(`/itinerary?trip=${tripId}`);
      } catch (error) {
        logger.error("Failed to save trip", error);
        setNameError("We couldn't save your itinerary. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [createTrip, data, isSaving, reset, router, tripName, suggestedTripName, onClose],
  );

  const handleClose = useCallback(() => {
    if (isSaving) {
      return;
    }
    onClose();
    setNameError(null);
  }, [isSaving, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Name your itinerary"
      description="Save this trip so you can revisit and refine it later."
      initialFocusRef={nameInputRef}
      closeOnBackdrop={!isSaving}
    >
      <form className="space-y-6" onSubmit={handleSubmitTripName}>
        <div className="space-y-2">
          <label htmlFor="itinerary-name" className="text-sm font-medium text-gray-900">
            Itinerary name
          </label>
          <Input
            id="itinerary-name"
            ref={nameInputRef}
            value={tripName}
            onChange={handleTripNameChange}
            placeholder="e.g. Kyoto cherry blossom escape"
            autoComplete="off"
            disabled={isSaving}
            error={nameError ?? undefined}
          />
          {nameError ? <p className="text-sm text-red-600">{nameError}</p> : null}
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save itinerary"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

