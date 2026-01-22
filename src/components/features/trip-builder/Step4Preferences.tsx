"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { useTripBuilder } from "@/context/TripBuilderContext";

const DIETARY_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
  { id: "gluten_free", label: "Gluten-Free" },
  { id: "no_seafood", label: "No Seafood" },
  { id: "other", label: "Other" },
];

const ORDERED_DIETARY_IDS = DIETARY_OPTIONS.map((option) => option.id);

const sortDietarySelections = (selections: Iterable<string>): string[] => {
  const set = new Set(selections);
  return ORDERED_DIETARY_IDS.filter((id) => set.has(id));
};

export type Step4PreferencesProps = {
  formId: string;
  onNext: () => void;
  onValidityChange?: (isValid: boolean) => void;
};

export function Step4Preferences({ formId, onNext, onValidityChange }: Step4PreferencesProps) {
  const { data, setData } = useTripBuilder();

  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const mobility = data.accessibility?.mobility ?? false;
  const dietarySelections = sortDietarySelections(data.accessibility?.dietary ?? []);
  const notesValue = data.accessibility?.notes ?? "";
  const preferIndoorOnRain = data.weatherPreferences?.preferIndoorOnRain ?? false;

  const dietarySelectionSet = useMemo(() => new Set(dietarySelections), [dietarySelections]);
  const isOtherChecked = dietarySelectionSet.has("other");
  const notesDescriptionId = `${formId}-notes-description`;
  const notesErrorId = `${formId}-notes-error`;

  // Validation: if "Other" is selected, notes cannot be empty
  const isValid = useMemo(() => {
    if (isOtherChecked) {
      return notesValue.trim().length > 0;
    }
    return true;
  }, [isOtherChecked, notesValue]);

  // Report validity changes to parent
  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const upsertAccessibility = useCallback(
    (updater: (current: { mobility: boolean; dietary: string[]; dietaryOther: string; notes: string }) => {
      mobility: boolean;
      dietary: string[];
      dietaryOther: string;
      notes: string;
    }) => {
      setData((prev) => {
        const current = {
          mobility: prev.accessibility?.mobility ?? false,
          dietary: prev.accessibility?.dietary ?? [],
          dietaryOther: prev.accessibility?.dietaryOther ?? "",
          notes: prev.accessibility?.notes ?? "",
        };
        const next = updater(current);
        return {
          ...prev,
          accessibility: {
            mobility: next.mobility,
            dietary: next.dietary,
            dietaryOther: next.dietaryOther,
            notes: next.notes,
          },
        };
      });
    },
    [setData],
  );

  const handleMobilityChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextChecked = event.target.checked;
      upsertAccessibility((current) => ({
        ...current,
        mobility: nextChecked,
      }));
    },
    [upsertAccessibility],
  );

  const toggleDietaryOption = useCallback(
    (optionId: string) => {
      // Clear error if "Other" is being unchecked
      if (optionId === "other" && isOtherChecked) {
        setNotesError(null);
      }
      upsertAccessibility((current) => {
        const working = new Set(current.dietary);
        if (working.has(optionId)) {
          working.delete(optionId);
        } else {
          working.add(optionId);
        }
        return {
          ...current,
          dietary: sortDietarySelections(working),
        };
      });
    },
    [isOtherChecked, upsertAccessibility],
  );

  const handleNotesChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      // Clear error when user starts typing
      if (notesError) {
        setNotesError(null);
      }
      // Update state immediately with the full value including spaces
      upsertAccessibility((current) => ({
        ...current,
        notes: nextValue,
      }));
    },
    [notesError, upsertAccessibility],
  );

  const handleWeatherPreferenceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextChecked = event.target.checked;
      setData((prev) => ({
        ...prev,
        weatherPreferences: {
          ...prev.weatherPreferences,
          preferIndoorOnRain: nextChecked,
        },
      }));
    },
    [setData],
  );

  const closeSkipConfirmation = useCallback(() => {
    setShowSkipConfirm(false);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const hasMobility = mobility;
      const hasDietary = dietarySelections.length > 0;
      const trimmedNotes = notesValue.trim();
      const hasNotes = trimmedNotes.length > 0;

      // Validate: if "Other" is selected, notes cannot be blank
      if (isOtherChecked && !hasNotes) {
        setNotesError("Please specify your dietary restriction in the additional notes.");
        // Scroll to the notes field
        const notesElement = document.getElementById(`${formId}-notes`);
        notesElement?.scrollIntoView({ behavior: "smooth", block: "center" });
        notesElement?.focus();
        return;
      }

      // Clear any previous errors
      setNotesError(null);

      if (!hasMobility && !hasDietary && !hasNotes) {
        setShowSkipConfirm(true);
        return;
      }

      setData((prev) => ({
        ...prev,
        accessibility: {
          mobility,
          dietary: sortDietarySelections(dietarySelections),
          dietaryOther: prev.accessibility?.dietaryOther ?? "",
          notes: trimmedNotes,
        },
        weatherPreferences: {
          ...prev.weatherPreferences,
          preferIndoorOnRain,
        },
      }));
      onNext();
    },
    [
      dietarySelections,
      formId,
      isOtherChecked,
      mobility,
      notesValue,
      preferIndoorOnRain,
      onNext,
      setData,
    ],
  );

  const confirmSkip = useCallback(() => {
    setData((prev) => {
      if (!prev.accessibility) {
        return prev;
      }
      return {
        ...prev,
        accessibility: undefined,
      };
    });
    setShowSkipConfirm(false);
    onNext();
  }, [onNext, setData]);

  return (
    <>
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="flex h-full flex-col gap-8"
        noValidate
      >
        <header className="max-w-2xl space-y-3">
          <h2 className="text-2xl font-semibold text-gray-900">
            Do you have any accessibility or dietary needs?
          </h2>
          <p className="text-sm text-gray-600">
            These help us suggest suitable locations and experiences.
          </p>
        </header>

        <section className="rounded-xl bg-gray-50 p-6">
          <div className="space-y-8">
            <div className="grid gap-4 lg:grid-cols-[220px,1fr] lg:gap-8">
              <div className="space-y-2">
                <label
                  htmlFor={`${formId}-mobility`}
                  className="text-sm font-semibold text-gray-900"
                >
                  Mobility assistance
                </label>
                <p className="text-sm text-gray-500">
                  Let us know if you&apos;d like step-free access, elevators, or other support.
                </p>
              </div>
              <label
                htmlFor={`${formId}-mobility`}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <input
                  id={`${formId}-mobility`}
                  type="checkbox"
                  checked={mobility}
                  onChange={handleMobilityChange}
                  className="mt-1 h-5 w-5 rounded border-gray-300 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                />
                <span className="text-sm text-gray-700">
                  I require mobility assistance or step-free access.
                </span>
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-[220px,1fr] lg:gap-8">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-gray-900">Dietary restrictions</span>
                <p className="text-sm text-gray-500">
                  Choose as many as you need. We&apos;ll adjust dining suggestions accordingly.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {DIETARY_OPTIONS.map((option) => {
                  const isChecked = dietarySelectionSet.has(option.id);
                  const isOther = option.id === "other";
                  return (
                    <div key={option.id} className={isOther ? "col-span-full" : ""}>
                      <label
                        htmlFor={`${formId}-dietary-${option.id}`}
                        className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        <input
                          id={`${formId}-dietary-${option.id}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDietaryOption(option.id)}
                          className="mt-1 h-5 w-5 rounded border-gray-300 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        />
                        <span>{option.label}</span>
                      </label>
                      {isOther && isOtherChecked && (
                        <div className="mt-3 pl-8">
                          <p className="text-sm text-gray-600">
                            Please specify your dietary restriction in the &quot;Additional notes&quot; section below.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[220px,1fr] lg:gap-8">
              <div className="space-y-2">
                <label
                  htmlFor={`${formId}-notes`}
                  className="text-sm font-semibold text-gray-900"
                >
                  Additional notes
                </label>
                <p id={notesDescriptionId} className="text-sm text-gray-500">
                  {isOtherChecked ? "Required" : "Optional"}. Add details like allergies, mobility devices{isOtherChecked ? ", dietary restrictions" : ""}, or anything else we should
                  keep in mind.
                </p>
              </div>
              <div className="space-y-2">
                <textarea
                  id={`${formId}-notes`}
                  value={notesValue}
                  onChange={handleNotesChange}
                  aria-describedby={notesError ? notesErrorId : notesDescriptionId}
                  aria-invalid={notesError ? true : undefined}
                  rows={4}
                  maxLength={5000}
                  placeholder="Tell us anything else that will help us tailor your trip."
                  autoComplete="off"
                  spellCheck="true"
                  className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-gray-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                    notesError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                {notesError && (
                  <p id={notesErrorId} className="text-sm text-red-600" role="alert">
                    {notesError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-gray-50 p-6">
          <div className="space-y-8">
            <div className="grid gap-4 lg:grid-cols-[220px,1fr] lg:gap-8">
              <div className="space-y-2">
                <label
                  htmlFor={`${formId}-weather-indoor`}
                  className="text-sm font-semibold text-gray-900"
                >
                  Weather preferences
                </label>
                <p className="text-sm text-gray-500">
                  Help us adjust your itinerary based on weather conditions.
                </p>
              </div>
              <label
                htmlFor={`${formId}-weather-indoor`}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <input
                  id={`${formId}-weather-indoor`}
                  type="checkbox"
                  checked={preferIndoorOnRain}
                  onChange={handleWeatherPreferenceChange}
                  className="mt-1 h-5 w-5 rounded border-gray-300 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                />
                <span className="text-sm text-gray-700">
                  Prefer indoor alternatives on rainy days
                </span>
              </label>
            </div>
          </div>
        </section>
      </form>

      <Modal
        isOpen={showSkipConfirm}
        onClose={closeSkipConfirmation}
        title="Continue without preferences?"
        description="We can still plan your trip, and you can update these preferences anytime."
        initialFocusRef={confirmButtonRef}
      >
        <div className="space-y-4 text-sm text-gray-600">
          <p>
            You haven&apos;t shared any accessibility or dietary needs. Are you sure you want to skip
            this step for now?
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeSkipConfirmation}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Go back
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={confirmSkip}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Skip step
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

