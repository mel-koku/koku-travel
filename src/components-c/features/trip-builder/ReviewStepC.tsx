"use client";

import { useCallback, useEffect, useMemo, useState as useStateReact } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Wallet, Gauge, Users, Accessibility, StickyNote, ChevronDown, Check, Building2, Search, X } from "lucide-react";

import { TripSummaryC } from "./TripSummaryC";
import { JRPassCardC } from "./JRPassCardC";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { detectPlanningWarnings, type PlanningWarning } from "@/lib/planning/tripWarnings";
import { PlanningWarningsList } from "@/components/features/trip-builder/PlanningWarning";
import { SavedInTripPreview } from "@/components/features/trip-builder/SavedInTripPreview";
import { BudgetInput, type BudgetMode, type BudgetValue } from "@/components/features/trip-builder/BudgetInput";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { cEase } from "@c/ui/motionC";
import type { TripStyle, TripBuilderData } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import { useState } from "react";
import { validateDurationRegionFit } from "@/lib/tripBuilder/durationValidation";
import { computeDefaultCityDays } from "@/lib/tripBuilder/cityDayAllocation";
import { useMapboxSearch, type MapboxSuggestion } from "@/hooks/useMapboxSearch";

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

export type ReviewStepCProps = {
  onValidityChange?: (isValid: boolean) => void;
  onGoToStep?: (step: number) => void;
  sanityConfig?: TripBuilderConfig;
};

export function ReviewStepC({
  onValidityChange,
  onGoToStep,
  sanityConfig,
}: ReviewStepCProps) {
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

  const durationWarning = useMemo(
    () => validateDurationRegionFit(data.duration ?? 0, data.regions ?? [], data.cities ?? []),
    [data.duration, data.regions, data.cities],
  );

  const handleEditDates = useCallback(() => onGoToStep?.(1), [onGoToStep]);
  const handleEditEntryPoint = useCallback(
    () => onGoToStep?.(2),
    [onGoToStep],
  );
  const handleEditVibes = useCallback(() => onGoToStep?.(3), [onGoToStep]);
  const handleEditRegions = useCallback(() => onGoToStep?.(4), [onGoToStep]);

  const handleWarningAction = useCallback(
    (warning: PlanningWarning) => {
      if (warning.type !== "return_to_airport") return;
      const returnCityId = warning.actionData?.returnCityId as string | undefined;
      if (!returnCityId) return;

      setData((prev) => {
        const cities = prev.cities ?? [];
        if (cities.length === 0) return prev;

        const duration = prev.duration ?? cities.length;
        const currentDays = prev.cityDays ?? computeDefaultCityDays(cities, duration);
        const lastDays = currentDays[currentDays.length - 1] ?? 1;

        if (lastDays < 2) return prev;

        const newCities = [...cities, returnCityId];
        const newDays = [...currentDays];
        newDays[newDays.length - 1] = lastDays - 1;
        newDays.push(1);

        return {
          ...prev,
          cities: newCities,
          cityDays: newDays,
          customCityOrder: true,
        };
      });
    },
    [setData],
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 pb-24 lg:pb-8">
      {/* Trip Summary */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Step 05
        </p>
        <h2
          className="mt-4 text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl"
          style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
        >
          Review your trip
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Make sure everything looks right before we build your itinerary.
        </p>
      </div>
      <TripSummaryC
        onEditDates={handleEditDates}
        onEditEntryPoint={handleEditEntryPoint}
        onEditVibes={handleEditVibes}
        onEditRegions={handleEditRegions}
      />

      {/* Planning Warnings */}
      {warnings.length > 0 && <PlanningWarningsList warnings={warnings} onAction={handleWarningAction} />}

      {/* Duration-to-Region Warning */}
      {durationWarning && (
        <div
          className="flex items-start gap-3 border px-4 py-3"
          style={{
            borderColor: durationWarning.severity === "warning"
              ? "color-mix(in srgb, var(--warning) 30%, transparent)"
              : "color-mix(in srgb, var(--primary) 30%, transparent)",
            backgroundColor: durationWarning.severity === "warning"
              ? "color-mix(in srgb, var(--warning) 5%, transparent)"
              : "color-mix(in srgb, var(--primary) 5%, transparent)",
          }}
        >
          <span className="mt-0.5 shrink-0 text-sm">
            {durationWarning.severity === "warning" ? "\u26A0\uFE0F" : "\u2139\uFE0F"}
          </span>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {durationWarning.message}
          </p>
        </div>
      )}

      {/* Accommodation */}
      {data.cities && data.cities.length > 0 && (
        <PreferenceCardC
          icon={<Building2 className="h-5 w-5" />}
          title="Accommodation"
          hasValue={!!data.accommodations && Object.keys(data.accommodations).length > 0}
          summary={
            data.accommodations
              ? `${Object.keys(data.accommodations).length} hotel${Object.keys(data.accommodations).length > 1 ? "s" : ""} set`
              : undefined
          }
        >
          <p className="text-xs text-[var(--muted-foreground)]">
            We&apos;ll route your days from your hotel.
          </p>
          <div className="flex flex-col gap-3">
            {data.cities.map((cityId) => (
              <AccommodationCityFieldC
                key={cityId}
                cityId={cityId}
                value={data.accommodations?.[cityId]}
                onChange={(accom) => {
                  setData((prev) => {
                    const next = { ...prev.accommodations };
                    if (accom) {
                      next[cityId] = accom;
                    } else {
                      delete next[cityId];
                    }
                    return { ...prev, accommodations: Object.keys(next).length > 0 ? next : undefined };
                  });
                }}
              />
            ))}
          </div>
        </PreferenceCardC>
      )}

      {/* First-Time Visitor Toggle */}
      <div
        className="flex items-center justify-between border border-[var(--border)] bg-[var(--background)] px-5 py-4"
      >
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
            First time in Japan?
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            We&apos;ll add orientation tips and pace Day 1 gently.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setData((prev) => ({
              ...prev,
              isFirstTimeVisitor: !prev.isFirstTimeVisitor,
            }))
          }
          className="relative h-6 w-11 shrink-0 transition-colors"
          style={{
            backgroundColor: data.isFirstTimeVisitor ? "var(--primary)" : "var(--border)",
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 h-5 w-5 bg-white transition-transform"
            style={{
              transform: data.isFirstTimeVisitor ? "translateX(1.25rem)" : "translateX(0)",
            }}
          />
        </button>
      </div>

      {/* Goshuin Collection Toggle */}
      <div
        className="flex items-center justify-between border border-[var(--border)] bg-[var(--background)] px-5 py-4"
      >
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
            Collect goshuin?
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Prioritize temples and shrines with stamp books.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setData((prev) => ({
              ...prev,
              collectGoshuin: !prev.collectGoshuin,
            }))
          }
          className="relative h-6 w-11 shrink-0 transition-colors"
          style={{
            backgroundColor: data.collectGoshuin ? "var(--primary)" : "var(--border)",
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 h-5 w-5 bg-white transition-transform"
            style={{
              transform: data.collectGoshuin ? "translateX(1.25rem)" : "translateX(0)",
            }}
          />
        </button>
      </div>

      {/* JR Pass Calculator */}
      <JRPassCardC duration={data.duration} cities={data.cities} />

      {/* Saved places */}
      <SavedInTripPreview selectedCities={data.cities} />

      {/* Preferences */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Optional
        </p>
        <h3
          className="mt-2 text-lg font-bold tracking-[-0.03em] text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
        >
          {sanityConfig?.reviewHeading ?? "Fine-tune your trip"}
        </h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {sanityConfig?.reviewDescription ?? "None of this is required, but it helps."}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {/* Budget */}
          <PreferenceCardC
            icon={<Wallet className="h-5 w-5" />}
            title={sanityConfig?.reviewBudgetTitle ?? "Budget"}
            hasValue={budgetValue?.amount !== undefined && budgetValue.amount > 0}
          >
            <BudgetInput
              id="budget-input-c"
              duration={data.duration}
              value={budgetValue}
              onChange={handleBudgetChange}
              onModeChange={setBudgetMode}
            />
          </PreferenceCardC>

          {/* Pace */}
          <PreferenceCardC
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
                      className={`flex items-start gap-3 border p-3 text-left transition ${
                        field.value === option.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/5"
                          : "border-[var(--border)] hover:bg-[var(--primary)]/5 hover:border-[var(--primary)]/30"
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
                        <span className="text-sm font-bold text-[var(--foreground)]">
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
          </PreferenceCardC>

          {/* Group */}
          <PreferenceCardC
            icon={<Users className="h-5 w-5" />}
            title={sanityConfig?.reviewGroupTitle ?? "Group"}
            hasValue={!!formValues.groupType || (formValues.groupSize !== undefined && formValues.groupSize > 0)}
            summary={[
              GROUP_TYPE_OPTIONS.find((o) => o.value === formValues.groupType)?.label,
              formValues.groupSize ? `${formValues.groupSize} travelers` : undefined,
            ].filter(Boolean).join(", ") || undefined}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField id="group-type-c" label="Type">
                <Controller
                  control={control}
                  name="groupType"
                  render={({ field }) => (
                    <Select
                      id="group-type-c"
                      placeholder="Select"
                      options={GROUP_TYPE_OPTIONS}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || "")}
                    />
                  )}
                />
              </FormField>
              <FormField id="group-size-c" label="Size">
                <Input
                  id="group-size-c"
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
              id="children-ages-c"
              label="Children Ages"
              help="Comma-separated"
            >
              <Input
                id="children-ages-c"
                placeholder="e.g., 5, 8, 12"
                className="min-h-[44px]"
                {...register("childrenAges")}
              />
            </FormField>
          </PreferenceCardC>

          {/* Accessibility */}
          <PreferenceCardC
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
              className={`flex min-h-[44px] items-center gap-2 border px-3 py-2 text-sm transition-colors ${
                formValues.mobilityAssistance
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--primary)]/5"
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
              <p className="mb-2 text-xs font-bold text-[var(--muted-foreground)]">
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
                      className={`min-h-[44px] border px-3 py-2 text-xs font-bold transition-colors ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--primary)]/5 hover:border-[var(--primary)]/30 hover:text-[var(--foreground)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {formValues.dietary?.includes("other") && (
              <FormField id="dietary-other-c" label="Other">
                <Input
                  id="dietary-other-c"
                  placeholder="Please specify..."
                  className="min-h-[44px]"
                  {...register("dietaryOther")}
                />
              </FormField>
            )}
          </PreferenceCardC>

          {/* Notes */}
          <PreferenceCardC
            icon={<StickyNote className="h-5 w-5" />}
            title={sanityConfig?.reviewNotesTitle ?? "Notes"}
            hasValue={!!formValues.additionalNotes?.trim()}
          >
            <textarea
              id="additional-notes-c"
              placeholder={
                sanityConfig?.reviewNotesPlaceholder ??
                "A birthday dinner in Kyoto, must see Fushimi Inari, anything we should know..."
              }
              className="w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              rows={4}
              {...register("additionalNotes")}
            />
          </PreferenceCardC>
        </div>
      </div>
    </div>
  );
}

/**
 * C-styled collapsible preference card.
 */
function PreferenceCardC({
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
    <div className="overflow-hidden border border-[var(--border)] bg-[var(--background)]">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--primary)]/5"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--surface)] text-[var(--primary)]">
          {icon}
        </div>
        <h4 className="flex-1 text-sm font-bold text-[var(--foreground)]">
          {title}
        </h4>
        {hasValue && !isOpen && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
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
            transition={{ duration: 0.3, ease: cEase }}
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

/**
 * Per-city accommodation search field (C variant).
 */
function AccommodationCityFieldC({
  cityId,
  value,
  onChange,
}: {
  cityId: string;
  value?: NonNullable<TripBuilderData["accommodations"]>[string];
  onChange: (accom: NonNullable<TripBuilderData["accommodations"]>[string] | undefined) => void;
}) {
  const [searchInput, setSearchInput] = useStateReact("");
  const { suggestions, isLoading } = useMapboxSearch(searchInput ? `${searchInput} ${cityId} Japan` : "");

  const handleSelect = useCallback((suggestion: MapboxSuggestion) => {
    if (!suggestion.coordinates) return;
    onChange({
      name: suggestion.name,
      coordinates: suggestion.coordinates,
      placeId: suggestion.mapbox_id,
    });
    setSearchInput("");
  }, [onChange, setSearchInput]);

  const cityLabel = cityId.charAt(0).toUpperCase() + cityId.slice(1);

  if (value) {
    return (
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          backgroundColor: "color-mix(in srgb, var(--primary) 5%, transparent)",
          border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{cityLabel}</p>
            <p className="truncate text-sm text-[var(--foreground)]">{value.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="shrink-0 p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{cityLabel}</p>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search hotel, Airbnb, address..."
          className="h-12 w-full border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
        {isLoading && searchInput.length >= 3 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="mt-1.5 max-h-40 overflow-auto border border-[var(--border)] bg-[var(--background)]">
          {suggestions.map((s) => (
            <button
              key={s.mapbox_id}
              type="button"
              onClick={() => handleSelect(s)}
              className="flex w-full cursor-pointer flex-col px-4 py-2 text-left transition-colors hover:bg-[var(--surface)]"
            >
              <p className="text-sm font-medium text-[var(--foreground)]">{s.name}</p>
              {s.place_formatted && (
                <p className="text-xs text-[var(--muted-foreground)]">{s.place_formatted}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
