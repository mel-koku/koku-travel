"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { TripSummaryEditorial } from "./TripSummaryEditorial";
import { FestivalNearMissCard } from "./FestivalNearMissCard";
import { FestivalIncludeCard } from "./FestivalIncludeCard";
import { OptionsSection, type OptionsFormValues } from "./OptionsSection";
import { type BudgetMode, type BudgetValue } from "./BudgetInput";
import { getTripTier, getTierPriceDollars } from "@/lib/billing/access";

import { m } from "framer-motion";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { useAppState } from "@/state/AppState";
import { REGIONS, deriveRegionsFromCities } from "@/data/regions";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import type { TripStyle, KnownCityId } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import { validateDurationRegionFit } from "@/lib/tripBuilder/durationValidation";

export type ReviewStepProps = {
  onValidityChange?: (isValid: boolean) => void;
  onGoToStep?: (step: number) => void;
  sanityConfig?: TripBuilderConfig;
};

export function ReviewStep({ onValidityChange, onGoToStep, sanityConfig }: ReviewStepProps) {
  const { data, setData } = useTripBuilder();
  const { userPreferences } = useAppState();
  const hasProfileDefaults = Boolean(
    userPreferences.defaultPace ||
    userPreferences.defaultGroupType ||
    userPreferences.dietaryRestrictions.length
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

  const defaultValues = useMemo<OptionsFormValues>(
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

  const { control, register, setValue } = useForm<OptionsFormValues>({
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

  const handleToggleFirstTime = useCallback(() => {
    setData((prev) => ({
      ...prev,
      isFirstTimeVisitor: !prev.isFirstTimeVisitor,
    }));
  }, [setData]);

  const syncToContext = useCallback(() => {
    const childrenAges =
      formValues.childrenAges
        ?.split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n)) ?? [];

    const groupType = formValues.groupType
      ? (formValues.groupType as "solo" | "couple" | "family" | "friends" | "business")
      : undefined;

    // Solo and couple have fixed sizes; family/friends use the input
    const groupSize =
      groupType === "solo" ? 1
        : groupType === "couple" ? 2
        : formValues.groupSize;

    setData((prev) => ({
      ...prev,
      group: {
        size: groupSize,
        type: groupType,
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

  // Headline for the step
  const headline = useMemo(() => {
    const cities = (data.cities ?? []) as KnownCityId[];
    const regionNames = cities.length > 0
      ? deriveRegionsFromCities(cities)
          .map((id) => REGIONS.find((r) => r.id === id)?.name)
          .filter(Boolean) as string[]
      : (data.regions ?? [])
          .map((id) => REGIONS.find((r) => r.id === id)?.name)
          .filter(Boolean) as string[];

    const regionStr =
      regionNames.length > 2
        ? `${regionNames.slice(0, 2).join(", ")} & more`
        : regionNames.join(" & ");

    const duration = data.duration;
    if (duration && regionStr) return `${duration} days in ${regionStr}`;
    if (duration) return `${duration} days in Japan`;
    if (regionStr) return `Your trip to ${regionStr}`;
    return "Here’s what you’ve got so far";
  }, [data.cities, data.regions, data.duration]);

  const durationWarning = useMemo(
    () => validateDurationRegionFit(data.duration ?? 0, data.regions ?? [], data.cities ?? []),
    [data.duration, data.regions, data.cities],
  );

  const totalDays = data.duration ?? data.cities?.length ?? 1;
  const tier = getTripTier(totalDays);
  const price = getTierPriceDollars(tier);

  // Navigation handlers (flat steps: 1=dates, 2=entry, 3=vibes, 4=regions)
  const handleEditDates = useCallback(() => onGoToStep?.(1), [onGoToStep]);
  const handleEditEntryPoint = useCallback(() => onGoToStep?.(2), [onGoToStep]);
  const handleEditVibes = useCallback(() => onGoToStep?.(3), [onGoToStep]);
  const handleEditRegions = useCallback(() => onGoToStep?.(4), [onGoToStep]);

  return (
    <div className="flex flex-col gap-8 pt-4 pb-32 lg:pb-8">
      {/* Step heading */}
      <div className="text-center">
        <p className="eyebrow-editorial text-brand-primary">STEP 05</p>
        <m.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className={cn(typography({ intent: "editorial-h2" }), "tracking-tight")}
        >
          {headline}
        </m.h2>
        {process.env.NEXT_PUBLIC_FREE_FULL_ACCESS === "true" ? (
          <p className={cn(typography({ intent: "utility-body-muted" }), "mt-3 text-center")}>
            Your full itinerary is free during our launch.
          </p>
        ) : (
          <p className={cn(typography({ intent: "utility-body-muted" }), "mt-3 text-center")}>
            Your first day is free. Unlock your full itinerary for ${price} after it&apos;s ready.
          </p>
        )}
      </div>

      {/* Single centered column — plan-forward */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <TripSummaryEditorial
          onEditDates={handleEditDates}
          onEditEntryPoint={handleEditEntryPoint}
          onEditVibes={handleEditVibes}
          onEditRegions={handleEditRegions}
          sanityConfig={sanityConfig}
          accommodations={data.accommodations}
          onAccommodationChange={(cityId, accom) => {
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

        {/* Festival near-miss stays inline directly under Route & Stays */}
        <FestivalNearMissCard />

        {/* Festival overlap auto-include CTA (KOK-32) */}
        <FestivalIncludeCard />

        {/* Duration warning */}
        {durationWarning && (
          <div
            role="alert"
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3",
              durationWarning.severity === "warning"
                ? "border-warning/30 bg-warning/5"
                : "border-sage/30 bg-sage/5"
            )}
          >
            <span className="mt-0.5 shrink-0 text-sm">
              {durationWarning.severity === "warning" ? "⚠️" : "ℹ️"}
            </span>
            <p className="text-sm text-foreground-secondary">{durationWarning.message}</p>
          </div>
        )}

        {/* Single Options section — bundles all 7 preferences. */}
        <OptionsSection
          control={control}
          register={register}
          setValue={setValue}
          formValues={formValues}
          isFirstTimeVisitor={Boolean(data.isFirstTimeVisitor)}
          onToggleFirstTime={handleToggleFirstTime}
          budgetValue={budgetValue}
          budgetMode={budgetMode}
          onBudgetModeChange={setBudgetMode}
          onBudgetChange={handleBudgetChange}
          duration={data.duration}
          showProfileHint={hasProfileDefaults}
          budgetTitle={sanityConfig?.reviewBudgetTitle}
          notesTitle={sanityConfig?.reviewNotesTitle}
          notesPlaceholder={sanityConfig?.reviewNotesPlaceholder}
        />
      </div>
    </div>
  );
}
