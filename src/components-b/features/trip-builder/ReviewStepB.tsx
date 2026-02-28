"use client";

import { useCallback, useEffect, useMemo, useState as useStateReact } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Wallet, Gauge, Users, Accessibility, StickyNote, ChevronDown, Check } from "lucide-react";

import { TripSummaryB } from "./TripSummaryB";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { detectPlanningWarnings } from "@/lib/planning/tripWarnings";
import { PlanningWarningsList } from "@/components/features/trip-builder/PlanningWarning";
import { SavedInTripPreview } from "@/components/features/trip-builder/SavedInTripPreview";
import { BudgetInput, type BudgetMode, type BudgetValue } from "@/components/features/trip-builder/BudgetInput";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import type { TripStyle } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import { useState } from "react";

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
    description: "Slow mornings, long lunches",
  },
  {
    label: "Balanced",
    value: "balanced",
    description: "Mix of sightseeing and downtime",
  },
  {
    label: "Fast",
    value: "fast",
    description: "Full days, lots of ground covered",
  },
];

export type ReviewStepBProps = {
  onValidityChange?: (isValid: boolean) => void;
  onGoToStep?: (step: number) => void;
  sanityConfig?: TripBuilderConfig;
};

export function ReviewStepB({
  onValidityChange,
  onGoToStep,
  sanityConfig,
}: ReviewStepBProps) {
  const { data, setData } = useTripBuilder();

  const [budgetMode, setBudgetMode] = useState<BudgetMode>("perDay");

  const budgetValue = useMemo<BudgetValue | undefined>(() => {
    const perDay = data.budget?.perDay;
    const total = data.budget?.total;
    if (budgetMode === "perDay" && perDay !== undefined)
      return { amount: perDay, mode: "perDay" };
    if (budgetMode === "total" && total !== undefined)
      return { amount: total, mode: "total" };
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
    [data],
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
        budget: {
          ...prev.budget,
          total: budget.total,
          perDay: budget.perDay,
        },
      }));
    },
    [setData],
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
          ? (formValues.groupType as
              | "solo"
              | "couple"
              | "family"
              | "friends"
              | "business")
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

  useEffect(() => {
    syncToContext();
    onValidityChange?.(true);
  }, [syncToContext, onValidityChange]);

  const warnings = useMemo(() => detectPlanningWarnings(data), [data]);

  const handleEditDates = useCallback(() => onGoToStep?.(1), [onGoToStep]);
  const handleEditEntryPoint = useCallback(
    () => onGoToStep?.(2),
    [onGoToStep],
  );
  const handleEditVibes = useCallback(() => onGoToStep?.(3), [onGoToStep]);
  const handleEditRegions = useCallback(() => onGoToStep?.(4), [onGoToStep]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 pb-24 lg:pb-8">
      {/* Trip Summary */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Step 05
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl">
          Review your trip
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Make sure everything looks right before we build your itinerary.
        </p>
      </div>
      <TripSummaryB
        onEditDates={handleEditDates}
        onEditEntryPoint={handleEditEntryPoint}
        onEditVibes={handleEditVibes}
        onEditRegions={handleEditRegions}
      />

      {/* Planning Warnings */}
      {warnings.length > 0 && <PlanningWarningsList warnings={warnings} />}

      {/* Saved places */}
      <SavedInTripPreview selectedCities={data.cities} />

      {/* Preferences */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Optional
        </p>
        <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
          {sanityConfig?.reviewHeading ?? "Fine-tune your trip"}
        </h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {sanityConfig?.reviewDescription ?? "None of this is required, but it helps."}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {/* Budget */}
          <PreferenceCardB
            icon={<Wallet className="h-5 w-5" />}
            title={sanityConfig?.reviewBudgetTitle ?? "Budget"}
            hasValue={budgetValue?.amount !== undefined && budgetValue.amount > 0}
          >
            <BudgetInput
              id="budget-input-b"
              duration={data.duration}
              value={budgetValue}
              onChange={handleBudgetChange}
              onModeChange={setBudgetMode}
            />
          </PreferenceCardB>

          {/* Pace */}
          <PreferenceCardB
            icon={<Gauge className="h-5 w-5" />}
            title={sanityConfig?.reviewPaceTitle ?? "Pace"}
            hasValue={!!formValues.travelStyle}
            summary={PACE_OPTIONS.find((o) => o.value === formValues.travelStyle)?.label}
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
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                        field.value === option.value
                          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                          : "border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <div
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition ${
                          field.value === option.value
                            ? "border-[var(--primary)] bg-[var(--primary)]"
                            : "border-[var(--border)]"
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          {option.label}
                        </span>
                        <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                          {option.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            />
          </PreferenceCardB>

          {/* Group */}
          <PreferenceCardB
            icon={<Users className="h-5 w-5" />}
            title={sanityConfig?.reviewGroupTitle ?? "Group"}
            hasValue={!!formValues.groupType || (formValues.groupSize !== undefined && formValues.groupSize > 0)}
            summary={[
              GROUP_TYPE_OPTIONS.find((o) => o.value === formValues.groupType)?.label,
              formValues.groupSize ? `${formValues.groupSize} travelers` : undefined,
            ].filter(Boolean).join(", ") || undefined}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField id="group-type-b" label="Type">
                <Controller
                  control={control}
                  name="groupType"
                  render={({ field }) => (
                    <Select
                      id="group-type-b"
                      placeholder="Select"
                      options={GROUP_TYPE_OPTIONS}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || "")}
                    />
                  )}
                />
              </FormField>
              <FormField id="group-size-b" label="Size">
                <Input
                  id="group-size-b"
                  type="number"
                  min={1}
                  max={20}
                  placeholder="Travelers"
                  className="min-h-[44px]"
                  {...register("groupSize", { valueAsNumber: true })}
                />
              </FormField>
            </div>
            <FormField
              id="children-ages-b"
              label="Children Ages"
              help="Comma-separated"
            >
              <Input
                id="children-ages-b"
                placeholder="e.g., 5, 8, 12"
                className="min-h-[44px]"
                {...register("childrenAges")}
              />
            </FormField>
          </PreferenceCardB>

          {/* Accessibility */}
          <PreferenceCardB
            icon={<Accessibility className="h-5 w-5" />}
            title={sanityConfig?.reviewAccessTitle ?? "Access"}
            hasValue={!!formValues.mobilityAssistance || (formValues.dietary?.length ?? 0) > 0}
          >
            <button
              type="button"
              onClick={() =>
                setValue(
                  "mobilityAssistance",
                  !formValues.mobilityAssistance,
                )
              }
              className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                formValues.mobilityAssistance
                  ? "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface)]"
              }`}
            >
              {formValues.mobilityAssistance && (
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                </svg>
              )}
              Mobility assistance
            </button>

            <div>
              <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
                Dietary
              </p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((option) => {
                  const isSelected = formValues.dietary?.includes(
                    option.id,
                  );
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
                      className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:border-[var(--primary)]/30 hover:text-[var(--foreground)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {formValues.dietary?.includes("other") && (
              <FormField id="dietary-other-b" label="Other">
                <Input
                  id="dietary-other-b"
                  placeholder="Please specify..."
                  className="min-h-[44px]"
                  {...register("dietaryOther")}
                />
              </FormField>
            )}
          </PreferenceCardB>

          {/* Notes */}
          <PreferenceCardB
            icon={<StickyNote className="h-5 w-5" />}
            title={sanityConfig?.reviewNotesTitle ?? "Notes"}
            hasValue={!!formValues.additionalNotes?.trim()}
          >
            <textarea
              id="additional-notes-b"
              placeholder={
                sanityConfig?.reviewNotesPlaceholder ??
                "A birthday dinner in Kyoto, avoiding steep stairs, must-see spots..."
              }
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              rows={4}
              {...register("additionalNotes")}
            />
          </PreferenceCardB>
        </div>
      </div>
    </div>
  );
}

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

/**
 * B-styled collapsible preference card — collapsed by default.
 */
function PreferenceCardB({
  icon,
  title,
  hasValue = false,
  summary,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hasValue?: boolean;
  summary?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useStateReact(false);

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--surface)]/50"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--primary)]">
          {icon}
        </div>
        <h4 className="flex-1 text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h4>
        {hasValue && !isOpen && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--primary)]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            {summary || "Set"}
          </span>
        )}
        {!hasValue && !isOpen && (
          <span className="text-xs text-[var(--muted-foreground)]">Optional</span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: bEase }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 px-5 pb-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
