"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { useFormattedTripData } from "./Step5Review/useFormattedTripData";
import { ReviewSection } from "./Step5Review/ReviewSection";
import { ReviewRow } from "./Step5Review/ReviewRow";
import { TripNameDialog } from "./Step5Review/TripNameDialog";

type Step5ReviewProps = {
  onEditStep: (step: number) => void;
};

export function Step5Review({ onEditStep }: Step5ReviewProps) {
  const { data, reset } = useTripBuilder();
  const [isNameDialogOpen, setNameDialogOpen] = useState(false);
  const {
    suggestedTripName,
    formattedDates,
    formattedRegions,
    formattedCities,
    formattedInterests,
    formattedDietary,
    formattedTripStyle,
    notesValue,
  } = useFormattedTripData(data);

  const handleStartOver = useCallback(() => {
    reset();
    onEditStep(1);
  }, [onEditStep, reset]);

  const handleConfirmClick = useCallback(() => {
    setNameDialogOpen(true);
  }, []);

  const handleNameDialogClose = useCallback(() => {
    setNameDialogOpen(false);
  }, []);

  return (
    <div className="py-8 sm:py-12 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:gap-10 md:gap-12">
        <header className="space-y-2 sm:space-y-3">
          <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Review Your Trip</h2>
          <p className="text-base text-gray-600 sm:text-lg">Make sure everything looks right before continuing.</p>
          <p className="text-sm text-gray-500">
            After you confirm, your dashboard will show a preview with a &quot;View full plan&quot; button so
            you can jump back into the itinerary anytime.
          </p>
        </header>

        <div className="flex flex-col divide-y divide-gray-100">
          <ReviewSection
            title="Basic Info"
            description="Duration and key dates for your journey."
            editStep={1}
            onEditStep={onEditStep}
          >
            <dl className="space-y-2 sm:space-y-3">
              <ReviewRow
                label="Duration"
                value={
                  data.duration ? `${data.duration} day${data.duration === 1 ? "" : "s"}` : "Not set"
                }
              />
              <ReviewRow label="Dates" value={formattedDates} />
            </dl>
          </ReviewSection>

          <ReviewSection
            title="Regions &amp; Cities"
            description="Where you plan to explore."
            editStep={2}
            onEditStep={onEditStep}
          >
            <dl className="space-y-2 sm:space-y-3">
              <ReviewRow label="Regions" value={formattedRegions} />
              <ReviewRow label="Cities" value={formattedCities} />
            </dl>
          </ReviewSection>

          <ReviewSection
            title="Interests &amp; Pace"
            description="How you want to spend your time."
            editStep={3}
            onEditStep={onEditStep}
          >
            <dl className="space-y-2 sm:space-y-3">
              <ReviewRow label="Interests" value={formattedInterests} />
              <ReviewRow label="Travel pace" value={formattedTripStyle} />
            </dl>
          </ReviewSection>

          <ReviewSection
            title="Preferences"
            description="Accessibility needs and personal notes."
            editStep={4}
            onEditStep={onEditStep}
          >
            <dl className="space-y-2 sm:space-y-3">
              <ReviewRow
                label="Mobility assistance"
                value={
                  data.accessibility?.mobility
                    ? "Required"
                    : "No mobility assistance noted"
                }
              />
              <ReviewRow label="Dietary needs" value={formattedDietary} />
              <ReviewRow
                label="Notes"
                value={notesValue && notesValue.length > 0 ? notesValue : "No additional notes"}
              />
            </dl>
          </ReviewSection>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="secondary" size="lg" onClick={handleStartOver} className="w-full sm:w-auto">
            Start Over
          </Button>
          <Button type="button" size="lg" onClick={handleConfirmClick} className="w-full sm:w-auto">
            Confirm Trip
          </Button>
        </div>
      </div>

      <TripNameDialog
        isOpen={isNameDialogOpen}
        onClose={handleNameDialogClose}
        suggestedTripName={suggestedTripName}
        data={data}
      />
    </div>
  );
}
