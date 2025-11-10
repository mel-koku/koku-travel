"use client";

import { ChangeEvent, FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { useAppState } from "@/state/AppState";
import { INTEREST_CATEGORIES } from "@/data/interests";
import { REGIONS } from "@/data/regions";
import { generateItineraryFromTrip } from "@/lib/itineraryGenerator";
import type { CityId, InterestId, RegionId, TripBuilderData, TripStyle } from "@/types/trip";

const REGION_LABEL_BY_ID = REGIONS.reduce<Record<RegionId, string>>((acc, region) => {
  acc[region.id] = region.name;
  return acc;
}, {} as Record<RegionId, string>);

const CITY_LABEL_BY_ID = REGIONS.reduce<Record<CityId, string>>((acc, region) => {
  region.cities.forEach((city) => {
    acc[city.id] = city.name;
  });
  return acc;
}, {} as Record<CityId, string>);

const INTEREST_LABEL_BY_ID = INTEREST_CATEGORIES.reduce<Record<InterestId, string>>((acc, category) => {
  acc[category.id] = category.name;
  return acc;
}, {} as Record<InterestId, string>);

const TRIP_STYLE_LABEL: Record<TripStyle, string> = {
  relaxed: "Relaxed",
  balanced: "Balanced",
  fast: "Fast",
};

const DIETARY_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  gluten_free: "Gluten-Free",
  no_seafood: "No Seafood",
  other: "Other",
};

type Step5ReviewProps = {
  onEditStep: (step: number) => void;
};

export function Step5Review({ onEditStep }: Step5ReviewProps) {
  const { data, reset } = useTripBuilder();
  const { createTrip } = useAppState();
  const router = useRouter();
  const [isNameDialogOpen, setNameDialogOpen] = useState(false);
  const [tripName, setTripName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const suggestedTripName = useMemo(() => {
    const fallback = "My Japan Itinerary";

    const startDate = data.dates?.start;
    if (startDate) {
      const parsed = new Date(startDate);
      if (!Number.isNaN(parsed.getTime())) {
        const formatter = new Intl.DateTimeFormat(undefined, {
          month: "long",
          day: "numeric",
        });
        const label = formatter.format(parsed);
        if (data.duration && Number.isFinite(data.duration)) {
          return `${label} · ${data.duration}-day plan`;
        }
        return `${label} getaway`;
      }
    }

    if (data.cities && data.cities.length > 0) {
      const city = data.cities[0];
      const cityLabel = CITY_LABEL_BY_ID[city] ?? city;
      return `${cityLabel} adventure`;
    }

    if (data.regions && data.regions.length > 0) {
      const region = data.regions[0];
      const regionLabel = REGION_LABEL_BY_ID[region] ?? region;
      return `${regionLabel} journey`;
    }

    return fallback;
  }, [data]);

  const formattedDates = useMemo(() => {
    if (!data.dates?.start && !data.dates?.end) {
      return "Not set";
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    });

    const startLabel = data.dates?.start ? safeFormatDate(formatter, data.dates.start) : "Start date not set";
    const endLabel = data.dates?.end ? safeFormatDate(formatter, data.dates.end) : "End date not set";

    if (!data.dates?.start || !data.dates?.end) {
      return `${startLabel}${data.dates?.start && data.dates?.end ? "" : " · "}${endLabel}`;
    }

    return `${startLabel} → ${endLabel}`;
  }, [data.dates]);

  const formattedRegions = useMemo(() => {
    if (!data.regions || data.regions.length === 0) {
      return "No regions selected";
    }
    return data.regions
      .map((regionId) => REGION_LABEL_BY_ID[regionId] ?? regionId)
      .join(", ");
  }, [data.regions]);

  const formattedCities = useMemo(() => {
    if (!data.cities || data.cities.length === 0) {
      return "No cities selected";
    }
    return data.cities.map((cityId) => CITY_LABEL_BY_ID[cityId] ?? cityId).join(", ");
  }, [data.cities]);

  const formattedInterests = useMemo(() => {
    if (!data.interests || data.interests.length === 0) {
      return "No interests selected";
    }
    return data.interests.map((interestId) => INTEREST_LABEL_BY_ID[interestId] ?? interestId).join(", ");
  }, [data.interests]);

  const formattedDietary = useMemo(() => {
    const dietary = data.accessibility?.dietary ?? [];
    if (dietary.length === 0) {
      return "No dietary restrictions";
    }
    return dietary
      .map((entry) => DIETARY_LABELS[entry] ?? entry)
      .join(", ");
  }, [data.accessibility?.dietary]);

  const notesValue = data.accessibility?.notes?.trim();

  const handleStartOver = useCallback(() => {
    reset();
    onEditStep(1);
  }, [onEditStep, reset]);

  const handleConfirmClick = useCallback(() => {
    if (isSaving) {
      return;
    }
    setTripName((current) => {
      const trimmed = current.trim();
      return trimmed.length > 0 ? trimmed : suggestedTripName;
    });
    setNameError(null);
    setNameDialogOpen(true);
  }, [isSaving, suggestedTripName]);

  const handleNameDialogClose = useCallback(() => {
    if (isSaving) {
      return;
    }
    setNameDialogOpen(false);
    setNameError(null);
  }, [isSaving]);

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
      if (trimmed.length === 0) {
        setNameError("Please enter a name for your itinerary.");
        return;
      }
      setIsSaving(true);
      try {
        const builderSnapshot = JSON.parse(JSON.stringify(data)) as TripBuilderData;
        const itinerary = generateItineraryFromTrip(builderSnapshot);
        const tripId = createTrip({
          name: trimmed,
          itinerary,
          builderData: builderSnapshot,
        });
        setTripName(trimmed);
        reset();
        setNameDialogOpen(false);
        setNameError(null);
        router.push(`/itinerary?trip=${tripId}`);
      } catch (error) {
        console.error("Failed to save trip", error);
        setNameError("We couldn't save your itinerary. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [createTrip, data, isSaving, reset, router, tripName],
  );

  const handleExport = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const payload = JSON.stringify(data, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "koku_trip_data.json";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      // Silently ignore export failures — no user action required.
    }
  }, [data]);

  const renderRow = useCallback((label: string, value: string) => {
    return (
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <dt className="text-sm font-semibold text-gray-900">{label}</dt>
        <dd className="text-sm text-gray-700 sm:text-right">{value}</dd>
      </div>
    );
  }, []);

  return (
    <div className="py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="space-y-3">
          <h2 className="text-3xl font-semibold text-gray-900">Review Your Trip</h2>
          <p className="text-lg text-gray-600">Make sure everything looks right before continuing.</p>
        </header>

        <div className="flex flex-col divide-y divide-gray-100">
          <section className="space-y-4 py-8 first:pt-0">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Basic Info</h3>
                    <p className="text-sm text-gray-500">Duration and key dates for your journey.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditStep(1)}
                    aria-label="Edit basic info section"
                  >
                    Edit
                  </Button>
                </div>
                <dl className="space-y-3">
                  {renderRow(
                    "Duration",
                    data.duration ? `${data.duration} day${data.duration === 1 ? "" : "s"}` : "Not set",
                  )}
                  {renderRow("Dates", formattedDates)}
                </dl>
              </div>
            </div>
          </section>

          <section className="space-y-4 py-8">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Regions &amp; Cities</h3>
                    <p className="text-sm text-gray-500">Where you plan to explore.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditStep(2)}
                    aria-label="Edit regions and cities section"
                  >
                    Edit
                  </Button>
                </div>
                <dl className="space-y-3">
                  {renderRow("Regions", formattedRegions)}
                  {renderRow("Cities", formattedCities)}
                </dl>
              </div>
            </div>
          </section>

          <section className="space-y-4 py-8">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Interests &amp; Pace</h3>
                    <p className="text-sm text-gray-500">How you want to spend your time.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditStep(3)}
                    aria-label="Edit interests and pace section"
                  >
                    Edit
                  </Button>
                </div>
                <dl className="space-y-3">
                  {renderRow("Interests", formattedInterests)}
                  {renderRow("Travel pace", data.style ? TRIP_STYLE_LABEL[data.style] ?? data.style : "Not set")}
                </dl>
              </div>
            </div>
          </section>

          <section className="space-y-4 py-8 last:pb-0">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
                    <p className="text-sm text-gray-500">Accessibility needs and personal notes.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditStep(4)}
                    aria-label="Edit preferences section"
                  >
                    Edit
                  </Button>
                </div>
                <dl className="space-y-3">
                  {renderRow(
                    "Mobility assistance",
                    data.accessibility?.mobility ? "Required" : "No mobility assistance noted",
                  )}
                  {renderRow("Dietary needs", formattedDietary)}
                  {renderRow("Notes", notesValue && notesValue.length > 0 ? notesValue : "No additional notes")}
                </dl>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={handleConfirmClick}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-white shadow-sm transition hover:bg-indigo-700 focus-visible:ring-indigo-500"
              >
                Confirm Trip
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartOver}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 focus-visible:ring-indigo-500"
              >
                Start Over
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 focus-visible:ring-indigo-500"
            >
              Export JSON
            </Button>
          </div>
        </div>
      </div>
      <Modal
        isOpen={isNameDialogOpen}
        onClose={handleNameDialogClose}
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
            <Button type="button" variant="outline" onClick={handleNameDialogClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save itinerary"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function safeFormatDate(formatter: Intl.DateTimeFormat, isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  try {
    return formatter.format(date);
  } catch {
    return isoDate;
  }
}


