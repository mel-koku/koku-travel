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

import { TripSummaryCard } from "./TripSummaryCard";
import { PreferenceRow } from "./PreferenceRow";
import { PlanningWarningsList } from "./PlanningWarning";
import { BudgetInput, type BudgetMode, type BudgetValue } from "./BudgetInput";
import { SavedLocationsPreview } from "./SavedLocationsPreview";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { detectPlanningWarnings } from "@/lib/planning/tripWarnings";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
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
  {
    label: "Relaxed",
    value: "relaxed",
    description: "Slow mornings, gentle pacing",
  },
  {
    label: "Balanced",
    value: "balanced",
    description: "Mix of highlights and downtime",
  },
  { label: "Fast", value: "fast", description: "Packed schedules, see everything" },
];

export type ReviewStepProps = {
  onValidityChange?: (isValid: boolean) => void;
  onGoToStep?: (step: number, subStep?: number) => void;
};

export function ReviewStep({ onValidityChange, onGoToStep }: ReviewStepProps) {
  const { data, setData } = useTripBuilder();

  // Handler to remove a saved location from the queue
  const handleRemoveSavedLocation = useCallback(
    (locationId: string) => {
      setData((prev) => ({
        ...prev,
        savedLocationIds: prev.savedLocationIds?.filter((id) => id !== locationId),
      }));
    },
    [setData]
  );

  // Budget mode state
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("perDay");

  // Budget value
  const budgetValue = useMemo<BudgetValue | undefined>(() => {
    const perDay = data.budget?.perDay;
    const total = data.budget?.total;

    if (budgetMode === "perDay" && perDay !== undefined) {
      return { amount: perDay, mode: "perDay" };
    }
    if (budgetMode === "total" && total !== undefined) {
      return { amount: total, mode: "total" };
    }
    if (perDay !== undefined) {
      return { amount: perDay, mode: "perDay" };
    }
    if (total !== undefined) {
      return { amount: total, mode: "total" };
    }
    return undefined;
  }, [data.budget?.perDay, data.budget?.total, budgetMode]);

  // Form setup
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

  // Handle budget change
  const handleBudgetChange = useCallback(
    (budget: { total?: number; perDay?: number }) => {
      setData((prev) => ({
        ...prev,
        budget: {
          ...prev.budget,
          total: budget.total,
          perDay: budget.perDay,
        },
      }));
    },
    [setData]
  );

  // Sync form values to context
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
      style: formValues.travelStyle
        ? (formValues.travelStyle as TripStyle)
        : undefined,
      accessibility: {
        mobility: formValues.mobilityAssistance,
        dietary: formValues.dietary,
        dietaryOther: formValues.dietaryOther,
        notes: formValues.additionalNotes,
      },
    }));
  }, [formValues, setData]);

  // Sync on form changes
  useEffect(() => {
    syncToContext();
    onValidityChange?.(true);
  }, [syncToContext, onValidityChange]);

  // Detect planning warnings
  const warnings = useMemo(() => detectPlanningWarnings(data), [data]);

  // Check if preferences are set
  const isBudgetSet = Boolean(data.budget?.perDay || data.budget?.total);
  const isPaceSet = Boolean(data.style);
  const isGroupSet = Boolean(data.group?.type || data.group?.size);
  const isAccessibilitySet = Boolean(
    data.accessibility?.mobility ||
      (data.accessibility?.dietary?.length ?? 0) > 0
  );
  const isNotesSet = Boolean(data.accessibility?.notes?.trim());

  // Value displays for collapsed state
  const budgetDisplay = useMemo(() => {
    if (data.budget?.perDay) {
      return `~${data.budget.perDay.toLocaleString()} per day`;
    }
    if (data.budget?.total) {
      return `${data.budget.total.toLocaleString()} total`;
    }
    return undefined;
  }, [data.budget]);

  const paceDisplay = useMemo(() => {
    const option = PACE_OPTIONS.find((o) => o.value === data.style);
    return option?.label;
  }, [data.style]);

  const groupDisplay = useMemo(() => {
    const parts: string[] = [];
    if (data.group?.type) {
      const option = GROUP_TYPE_OPTIONS.find((o) => o.value === data.group?.type);
      parts.push(option?.label ?? data.group.type);
    }
    if (data.group?.size) {
      parts.push(`${data.group.size} travelers`);
    }
    return parts.length > 0 ? parts.join(", ") : undefined;
  }, [data.group]);

  const accessibilityDisplay = useMemo(() => {
    const parts: string[] = [];
    if (data.accessibility?.mobility) {
      parts.push("Mobility assistance");
    }
    if ((data.accessibility?.dietary?.length ?? 0) > 0) {
      parts.push(`${data.accessibility?.dietary?.length} dietary`);
    }
    return parts.length > 0 ? parts.join(", ") : undefined;
  }, [data.accessibility]);

  // Navigation handlers
  const handleEditDates = useCallback(() => {
    onGoToStep?.(1, 0);
  }, [onGoToStep]);

  const handleEditEntryPoint = useCallback(() => {
    onGoToStep?.(1, 1);
  }, [onGoToStep]);

  const handleEditVibes = useCallback(() => {
    onGoToStep?.(1, 2);
  }, [onGoToStep]);

  const handleEditRegions = useCallback(() => {
    onGoToStep?.(2);
  }, [onGoToStep]);

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Trip Summary */}
      <TripSummaryCard
        onEditDates={handleEditDates}
        onEditEntryPoint={handleEditEntryPoint}
        onEditVibes={handleEditVibes}
        onEditRegions={handleEditRegions}
      />

      {/* Planning Warnings */}
      {warnings.length > 0 && <PlanningWarningsList warnings={warnings} />}

      {/* Saved Locations Section */}
      {(data.savedLocationIds?.length ?? 0) > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sage" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-primary">Queued</p>
              <h3 className="font-serif text-lg text-foreground">
                Saved Places ({data.savedLocationIds?.length})
              </h3>
              <p className="text-sm text-stone">
                These places will be included in your itinerary
              </p>
            </div>
          </div>
          <SavedLocationsPreview
            locationIds={data.savedLocationIds ?? []}
            selectedCities={data.cities}
            onRemove={handleRemoveSavedLocation}
          />
        </div>
      )}

      {/* Preferences Section */}
      <div>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-primary">Almost there</p>
          <h3 className="mt-1 font-serif text-lg text-foreground">
            Fine-tune your trip
          </h3>
          <p className="text-sm text-stone">
            These details help us build a better plan for you
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Budget */}
          <ScrollReveal delay={0} distance={15}>
          <PreferenceRow
            id="budget"
            icon={<Wallet className="h-4 w-4" />}
            title="Budget"
            description="Set your travel budget"
            value={budgetDisplay}
            isSet={isBudgetSet}
          >
            <BudgetInput
              id="budget-input"
              duration={data.duration}
              value={budgetValue}
              onChange={handleBudgetChange}
              onModeChange={setBudgetMode}
            />
          </PreferenceRow>
          </ScrollReveal>

          {/* Travel Pace */}
          <ScrollReveal delay={0.05} distance={15}>
          <PreferenceRow
            id="pace"
            icon={<Gauge className="h-4 w-4" />}
            title="Travel Pace"
            description="How do you like to travel?"
            value={paceDisplay}
            isSet={isPaceSet}
          >
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
                        "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                        field.value === option.value
                          ? "border-sage/20 bg-sage/10 ring-1 ring-brand-primary"
                          : "border-border hover:bg-surface"
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
          </PreferenceRow>
          </ScrollReveal>

          {/* Group Composition */}
          <ScrollReveal delay={0.1} distance={15}>
          <PreferenceRow
            id="group"
            icon={<Users className="h-4 w-4" />}
            title="Group Composition"
            description="Tell us about your travel group"
            value={groupDisplay}
            isSet={isGroupSet}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField id="group-type" label="Group Type">
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

              <FormField id="group-size" label="Group Size">
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
              help="Comma-separated (e.g., 5, 8, 12)"
            >
              <Input
                id="children-ages"
                placeholder="e.g., 5, 8, 12"
                className="min-h-[40px]"
                {...register("childrenAges")}
              />
            </FormField>
          </PreferenceRow>
          </ScrollReveal>

          {/* Accessibility & Dietary */}
          <ScrollReveal delay={0.15} distance={15}>
          <PreferenceRow
            id="accessibility"
            icon={<Accessibility className="h-4 w-4" />}
            title="Accessibility & Dietary"
            description="Special requirements to consider"
            value={accessibilityDisplay}
            isSet={isAccessibilitySet}
          >
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                {...register("mobilityAssistance")}
              />
              <span className="text-sm text-foreground-secondary">
                Need mobility assistance
              </span>
            </label>

            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-foreground-secondary">
                Dietary Restrictions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DIETARY_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      value={option.id}
                      className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                      {...register("dietary")}
                    />
                    <span className="text-sm text-foreground-secondary">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {formValues.dietary?.includes("other") && (
              <FormField id="dietary-other" label="Other Dietary Requirements">
                <Input
                  id="dietary-other"
                  placeholder="Please specify..."
                  className="min-h-[40px]"
                  {...register("dietaryOther")}
                />
              </FormField>
            )}
          </PreferenceRow>
          </ScrollReveal>

          {/* Additional Notes */}
          <ScrollReveal delay={0.2} distance={15}>
          <PreferenceRow
            id="notes"
            icon={<StickyNote className="h-4 w-4" />}
            title="Additional Notes"
            description="Anything else we should know?"
            value={isNotesSet ? "Notes added" : undefined}
            isSet={isNotesSet}
          >
            <textarea
              id="additional-notes"
              placeholder="Special requests, specific places you want to visit, etc."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              rows={4}
              {...register("additionalNotes")}
            />
          </PreferenceRow>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
