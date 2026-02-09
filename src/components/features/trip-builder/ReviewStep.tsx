"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Wallet,
  Gauge,
  Users,
  Accessibility,
  StickyNote,
  MapPin,
} from "lucide-react";

import { TripSummaryEditorial } from "./TripSummaryEditorial";
import { PreferenceCard } from "./PreferenceCard";
import { PlanningWarningsList } from "./PlanningWarning";
import { BudgetInput, type BudgetMode, type BudgetValue } from "./BudgetInput";
import { SavedLocationsPreview } from "./SavedLocationsPreview";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { detectPlanningWarnings } from "@/lib/planning/tripWarnings";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { TripStyle } from "@/types/trip";

type PreferenceFormValues = {
  groupSize?: number;
  groupType?: "solo" | "couple" | "family" | "friends" | "business" | "";
  childrenAges?: string;
  travelStyle?: TripStyle | "";
  mobilityAssistance?: boolean;
  dietary?: string[];
  dietaryOther?: string;
  additionalNotes?: string;
};

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
  { id: "gluten-free", label: "Gluten-Free" },
  { id: "dairy-free", label: "Dairy-Free" },
  { id: "other", label: "Other" },
];

const GROUP_TYPE_OPTIONS = [
  { label: "Solo", value: "solo" },
  { label: "Couple", value: "couple" },
  { label: "Family", value: "family" },
  { label: "Friends", value: "friends" },
  { label: "Business", value: "business" },
];

const PACE_OPTIONS = [
  { label: "Relaxed", value: "relaxed", description: "Slow mornings, long lunches" },
  { label: "Balanced", value: "balanced", description: "A bit of everything, room to breathe" },
  { label: "Fast", value: "fast", description: "Dawn to dusk, see it all" },
];

export type ReviewStepProps = {
  onValidityChange?: (isValid: boolean) => void;
  onGoToStep?: (step: number) => void;
};

export function ReviewStep({ onValidityChange, onGoToStep }: ReviewStepProps) {
  const { data, setData } = useTripBuilder();

  const handleRemoveSavedLocation = useCallback(
    (locationId: string) => {
      setData((prev) => ({
        ...prev,
        savedLocationIds: prev.savedLocationIds?.filter((id) => id !== locationId),
      }));
    },
    [setData]
  );

  const [budgetMode, setBudgetMode] = useState<BudgetMode>("perDay");

  const budgetValue = useMemo<BudgetValue | undefined>(() => {
    const perDay = data.budget?.perDay;
    const total = data.budget?.total;
    if (budgetMode === "perDay" && perDay !== undefined) return { amount: perDay, mode: "perDay" };
    if (budgetMode === "total" && total !== undefined) return { amount: total, mode: "total" };
    if (perDay !== undefined) return { amount: perDay, mode: "perDay" };
    if (total !== undefined) return { amount: total, mode: "total" };
    return undefined;
  }, [data.budget?.perDay, data.budget?.total, budgetMode]);

  const defaultValues = useMemo<PreferenceFormValues>(
    () => ({
      groupSize: data.group?.size,
      groupType: data.group?.type ?? "",
      childrenAges: data.group?.childrenAges?.join(", ") ?? "",
      travelStyle: data.style ?? "",
      mobilityAssistance: data.accessibility?.mobility,
      dietary: data.accessibility?.dietary ?? [],
      dietaryOther: data.accessibility?.dietaryOther ?? "",
      additionalNotes: data.accessibility?.notes ?? "",
    }),
    [data]
  );

  const { control, register } = useForm<PreferenceFormValues>({
    defaultValues,
    mode: "onChange",
  });

  const formValues = useWatch({ control });

  const handleBudgetChange = useCallback(
    (budget: { total?: number; perDay?: number }) => {
      setData((prev) => ({
        ...prev,
        budget: { ...prev.budget, total: budget.total, perDay: budget.perDay },
      }));
    },
    [setData]
  );

  const syncToContext = useCallback(() => {
    const childrenAges =
      formValues.childrenAges
        ?.split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n)) ?? [];

    setData((prev) => ({
      ...prev,
      group: {
        size: formValues.groupSize,
        type: formValues.groupType
          ? (formValues.groupType as "solo" | "couple" | "family" | "friends" | "business")
          : undefined,
        childrenAges: childrenAges.length > 0 ? childrenAges : undefined,
      },
      style: formValues.travelStyle ? (formValues.travelStyle as TripStyle) : undefined,
      accessibility: {
        mobility: formValues.mobilityAssistance,
        dietary: formValues.dietary,
        dietaryOther: formValues.dietaryOther,
        notes: formValues.additionalNotes,
      },
    }));
  }, [formValues, setData]);

  useEffect(() => {
    syncToContext();
    onValidityChange?.(true);
  }, [syncToContext, onValidityChange]);

  const warnings = useMemo(() => detectPlanningWarnings(data), [data]);

  // Navigation handlers (flat steps: 1=dates, 2=entry, 3=vibes, 4=regions)
  const handleEditDates = useCallback(() => onGoToStep?.(1), [onGoToStep]);
  const handleEditEntryPoint = useCallback(() => onGoToStep?.(2), [onGoToStep]);
  const handleEditVibes = useCallback(() => onGoToStep?.(3), [onGoToStep]);
  const handleEditRegions = useCallback(() => onGoToStep?.(4), [onGoToStep]);

  return (
    <div className="flex flex-col gap-8 pb-32 lg:pb-8">
      {/* Trip Summary — Editorial */}
      <TripSummaryEditorial
        onEditDates={handleEditDates}
        onEditEntryPoint={handleEditEntryPoint}
        onEditVibes={handleEditVibes}
        onEditRegions={handleEditRegions}
      />

      {/* Planning Warnings */}
      {warnings.length > 0 && <PlanningWarningsList warnings={warnings} />}

      {/* Saved Locations */}
      {(data.savedLocationIds?.length ?? 0) > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sage" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-primary">Queued</p>
              <h3 className="font-serif text-lg italic text-foreground">
                Saved Places ({data.savedLocationIds?.length})
              </h3>
            </div>
          </div>
          <SavedLocationsPreview
            locationIds={data.savedLocationIds ?? []}
            selectedCities={data.cities}
            onRemove={handleRemoveSavedLocation}
          />
        </div>
      )}

      {/* Preferences — Horizontal scroll row */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-brand-primary">Optional</p>
        <h3 className="mt-1 font-serif text-lg italic text-foreground">
          Fine-tune your trip
        </h3>
        <p className="text-sm text-stone">
          The more we know, the better your days will feel.
        </p>

        {/* Responsive grid */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Budget */}
          <PreferenceCard icon={<Wallet className="h-5 w-5" />} title="Budget" optional info="Sets the price range for food and activities.">
            <BudgetInput
              id="budget-input"
              duration={data.duration}
              value={budgetValue}
              onChange={handleBudgetChange}
              onModeChange={setBudgetMode}
            />
          </PreferenceCard>

          {/* Travel Pace */}
          <PreferenceCard icon={<Gauge className="h-5 w-5" />} title="Pace" optional info="How packed should each day be?">
            <Controller
              control={control}
              name="travelStyle"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  {PACE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                        field.value === option.value
                          ? "border-sage/20 bg-sage/10 ring-1 ring-brand-primary"
                          : "border-border hover:bg-background"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition",
                          field.value === option.value
                            ? "border-brand-primary bg-brand-primary"
                            : "border-border"
                        )}
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        <span className="ml-2 text-xs text-stone">
                          {option.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            />
          </PreferenceCard>

          {/* Group */}
          <PreferenceCard icon={<Users className="h-5 w-5" />} title="Group" optional info="Helps us pick the right kind of places.">
            <div className="grid grid-cols-2 gap-3">
              <FormField id="group-type" label="Type">
                <Controller
                  control={control}
                  name="groupType"
                  render={({ field }) => (
                    <Select
                      id="group-type"
                      placeholder="Select"
                      options={GROUP_TYPE_OPTIONS}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || "")}
                    />
                  )}
                />
              </FormField>
              <FormField id="group-size" label="Size">
                <Input
                  id="group-size"
                  type="number"
                  min={1}
                  max={20}
                  placeholder="Travelers"
                  className="min-h-[40px]"
                  {...register("groupSize", { valueAsNumber: true })}
                />
              </FormField>
            </div>
            <FormField
              id="children-ages"
              label="Children Ages"
              help="Comma-separated"
            >
              <Input
                id="children-ages"
                placeholder="e.g., 5, 8, 12"
                className="min-h-[40px]"
                {...register("childrenAges")}
              />
            </FormField>
          </PreferenceCard>

          {/* Accessibility */}
          <PreferenceCard
            icon={<Accessibility className="h-5 w-5" />}
            title="Access"
            optional
            info="We'll only suggest places that work for you."
          >
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                {...register("mobilityAssistance")}
              />
              <span className="text-sm text-foreground-secondary">
                Mobility assistance
              </span>
            </label>

            <div>
              <p className="mb-2 text-xs font-medium text-foreground-secondary">
                Dietary
              </p>
              <div className="flex flex-col gap-1.5">
                {DIETARY_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      value={option.id}
                      className="h-3.5 w-3.5 rounded border-border text-brand-primary focus:ring-brand-primary"
                      {...register("dietary")}
                    />
                    <span className="text-xs text-foreground-secondary">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {formValues.dietary?.includes("other") && (
              <FormField id="dietary-other" label="Other">
                <Input
                  id="dietary-other"
                  placeholder="Please specify..."
                  className="min-h-[40px]"
                  {...register("dietaryOther")}
                />
              </FormField>
            )}
          </PreferenceCard>

          {/* Notes */}
          <PreferenceCard icon={<StickyNote className="h-5 w-5" />} title="Notes" optional info="Anything we should know — a birthday, an allergy, a must-visit spot.">
            <textarea
              id="additional-notes"
              placeholder="A birthday dinner in Kyoto, avoiding steep stairs, must-see spots..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              rows={4}
              {...register("additionalNotes")}
            />
          </PreferenceCard>
        </div>
      </div>
    </div>
  );
}
