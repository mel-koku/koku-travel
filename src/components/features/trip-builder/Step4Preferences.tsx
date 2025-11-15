"use client";

import { ChangeEvent, FormEvent, useCallback, useMemo, useRef, useState } from "react";

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
};

export function Step4Preferences({ formId, onNext }: Step4PreferencesProps) {
  const { data, setData } = useTripBuilder();

  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const mobility = data.accessibility?.mobility ?? false;
  const dietarySelections = sortDietarySelections(data.accessibility?.dietary ?? []);
  const dietaryOtherValue = data.accessibility?.dietaryOther ?? "";
  const notesValue = data.accessibility?.notes ?? "";

  const dietarySelectionSet = useMemo(() => new Set(dietarySelections), [dietarySelections]);
  const isOtherChecked = dietarySelectionSet.has("other");
  const notesDescriptionId = `${formId}-notes-description`;

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
      upsertAccessibility((current) => {
        const working = new Set(current.dietary);
        if (working.has(optionId)) {
          working.delete(optionId);
          // Clear dietaryOther if "other" is unchecked
          if (optionId === "other") {
            return {
              ...current,
              dietary: sortDietarySelections(working),
              dietaryOther: "",
            };
          }
        } else {
          working.add(optionId);
        }
        return {
          ...current,
          dietary: sortDietarySelections(working),
        };
      });
    },
    [upsertAccessibility],
  );

  const handleDietaryOtherChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      upsertAccessibility((current) => ({
        ...current,
        dietaryOther: nextValue,
      }));
    },
    [upsertAccessibility],
  );

  const handleNotesChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      upsertAccessibility((current) => {
        if (current.notes === nextValue) {
          return current;
        }
        return {
          ...current,
          notes: nextValue,
        };
      });
    },
    [upsertAccessibility],
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

      if (!hasMobility && !hasDietary && !hasNotes) {
        setShowSkipConfirm(true);
        return;
      }

      setData((prev) => ({
        ...prev,
        accessibility: {
          mobility,
          dietary: sortDietarySelections(dietarySelections),
          dietaryOther: dietaryOtherValue.trim(),
          notes: trimmedNotes,
        },
      }));
      onNext();
    },
    [dietarySelections, dietaryOtherValue, mobility, notesValue, onNext, setData],
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
                          <input
                            type="text"
                            id={`${formId}-dietary-other-input`}
                            value={dietaryOtherValue}
                            onChange={handleDietaryOtherChange}
                            placeholder="Please specify your dietary restriction"
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0"
                          />
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
                  Optional. Add details like allergies, mobility devices, or anything else we should
                  keep in mind.
                </p>
              </div>
              <textarea
                id={`${formId}-notes`}
                value={notesValue}
                onChange={handleNotesChange}
                aria-describedby={notesDescriptionId}
                rows={4}
                placeholder="Tell us anything else that will help us tailor your trip."
                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0"
              />
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

