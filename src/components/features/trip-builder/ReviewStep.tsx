"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Wallet,
  Gauge,
  Users,
  Accessibility,
  StickyNote,
} from "lucide-react";

import { TripSummaryEditorial } from "./TripSummaryEditorial";
import { PreferenceCard } from "./PreferenceCard";
import { PlanningWarningsList } from "./PlanningWarning";
import { BudgetInput, type BudgetMode, type BudgetValue } from "./BudgetInput";
import { SavedInTripPreview } from "./SavedInTripPreview";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { detectPlanningWarnings } from "@/lib/planning/tripWarnings";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { TripStyle } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

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
  { label: "Balanced", value: "balanced", description: "Mix of sightseeing and downtime" },
  { label: "Fast", value: "fast", description: "Full days, lots of ground covered" },
];

export type ReviewStepProps = {
  onValidityChange?: (isValid: boolean) => void;
  onGoToStep?: (step: number) => void;
  sanityConfig?: TripBuilderConfig;
};

export function ReviewStep({ onValidityChange, onGoToStep, sanityConfig }: ReviewStepProps) {
  const { data, setData } = useTripBuilder();

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

  const { control, register, setValue } = useForm<PreferenceFormValues>({
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
        sanityConfig={sanityConfig}
      />

      {/* Planning Warnings */}
      {warnings.length > 0 && <PlanningWarningsList warnings={warnings} />}

      {/* Saved places that match selected cities */}
      <SavedInTripPreview selectedCities={data.cities} />

      {/* Preferences — Horizontal scroll row */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-brand-primary">Optional</p>
        <h3 className="mt-1 font-serif text-lg italic text-foreground">
          {sanityConfig?.reviewHeading ?? "Almost there"}
        </h3>
        <p className="text-sm text-stone">
          {sanityConfig?.reviewDescription ?? "None of this is required, but it helps."}
        </p>

        {/* Responsive grid */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Budget */}
          <PreferenceCard icon={<Wallet className="h-5 w-5" />} title={sanityConfig?.reviewBudgetTitle ?? "Budget"} optional info={sanityConfig?.reviewBudgetTooltip ?? "Rough range for food and activities."}>
            <BudgetInput
              id="budget-input"
              duration={data.duration}
              value={budgetValue}
              onChange={handleBudgetChange}
              onModeChange={setBudgetMode}
            />
          </PreferenceCard>

          {/* Travel Pace */}
          <PreferenceCard icon={<Gauge className="h-5 w-5" />} title={sanityConfig?.reviewPaceTitle ?? "Pace"} optional info={sanityConfig?.reviewPaceTooltip ?? "How packed should each day be?"}>
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
          <PreferenceCard icon={<Users className="h-5 w-5" />} title={sanityConfig?.reviewGroupTitle ?? "Group"} optional info={sanityConfig?.reviewGroupTooltip ?? "So we suggest the right kind of places."}>
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
            title={sanityConfig?.reviewAccessTitle ?? "Access"}
            optional
            info={sanityConfig?.reviewAccessTooltip ?? "We\u2019ll filter for places that work for you."}
          >
            <button
              type="button"
              onClick={() => setValue("mobilityAssistance", !formValues.mobilityAssistance)}
              className={cn(
                "flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                formValues.mobilityAssistance
                  ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                  : "border-border text-foreground-secondary hover:bg-surface"
              )}
            >
              {formValues.mobilityAssistance && (
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
              )}
              Mobility assistance
            </button>

            <div>
              <p className="mb-2 text-xs font-medium text-foreground-secondary">
                {sanityConfig?.reviewDietaryLabel ?? "Dietary"}
              </p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((option) => {
                  const isSelected = formValues.dietary?.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        const current = formValues.dietary ?? [];
                        const next = isSelected
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id];
                        setValue("dietary", next);
                      }}
                      className={cn(
                        "min-h-[44px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                          : "border-border text-foreground-secondary hover:bg-surface"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
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
          <PreferenceCard icon={<StickyNote className="h-5 w-5" />} title={sanityConfig?.reviewNotesTitle ?? "Notes"} optional info={sanityConfig?.reviewNotesTooltip ?? "Anything we should know \u2014 a birthday, an allergy, a must-visit spot."}>
            <textarea
              id="additional-notes"
              placeholder={sanityConfig?.reviewNotesPlaceholder ?? "A birthday dinner in Kyoto, avoiding steep stairs, must-see spots..."}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              rows={4}
              {...register("additionalNotes")}
            />
          </PreferenceCard>
        </div>
      </div>
    </div>
  );
}
