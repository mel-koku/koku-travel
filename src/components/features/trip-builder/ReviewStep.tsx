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
import { FestivalNearMissCard } from "./FestivalNearMissCard";
import { BudgetInput, type BudgetMode, type BudgetValue } from "./BudgetInput";
import { getTripTier, getTierPriceDollars } from "@/lib/billing/access";

import { motion } from "framer-motion";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { useAppState } from "@/state/AppState";
import { REGIONS, deriveRegionsFromCities } from "@/data/regions";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import type { TripStyle, KnownCityId } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import { validateDurationRegionFit } from "@/lib/tripBuilder/durationValidation";

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


const PACE_OPTIONS = [
  { label: "Relaxed", value: "relaxed", description: "Late starts, long lunches, fewer stops" },
  { label: "Balanced", value: "balanced", description: "Steady pace. Room to breathe." },
  { label: "Full", value: "fast", description: "Early to late, covering more ground" },
];

const GROUP_TYPE_SEGMENTS = [
  { label: "Solo", value: "solo" },
  { label: "Couple", value: "couple" },
  { label: "Family", value: "family" },
  { label: "Friends", value: "friends" },
];


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
    return "Here\u2019s what you\u2019ve got so far";
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
    <div className="flex flex-col gap-8 pb-32 lg:pb-8">
      {/* Step heading — centered, spans both columns */}
      <div className="text-center">
        <p className="eyebrow-editorial text-brand-primary">STEP 05</p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className={cn(typography({ intent: "editorial-h2" }), "tracking-tight")}
        >
          {headline}
        </motion.h2>
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

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left — Trip Summary (accommodation inline in Route & Stays) */}
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

        {/* Right — Settings, preferences, warnings */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
          {/* Toggles */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-brand-primary/5">
            <div>
              <p className="text-sm font-medium text-foreground">First time in Japan?</p>
              <p className="text-xs text-stone">Day 1 paced gently with orientation tips.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setData((prev) => ({
                  ...prev,
                  isFirstTimeVisitor: !prev.isFirstTimeVisitor,
                }))
              }
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                data.isFirstTimeVisitor ? "bg-brand-primary" : "bg-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-[var(--shadow-sm)]",
                  data.isFirstTimeVisitor && "translate-x-5"
                )}
              />
            </button>
          </div>

          {hasProfileDefaults && (
            <p className="text-xs text-stone">Some fields pre-filled from your profile.</p>
          )}

          {/* Pace — segmented control */}
          <div className="rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-brand-primary/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-stone" />
                <p className="text-sm font-medium text-foreground">Pace</p>
              </div>
              <Controller
                control={control}
                name="travelStyle"
                render={({ field }) => (
                  <div className="flex rounded-lg border border-border bg-background p-0.5">
                    {PACE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(field.value === option.value ? "" : option.value)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                          field.value === option.value
                            ? "bg-brand-primary text-white shadow-[var(--shadow-sm)]"
                            : "text-stone hover:text-foreground"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
            <Controller
              control={control}
              name="travelStyle"
              render={({ field }) => {
                const selected = PACE_OPTIONS.find((o) => o.value === field.value);
                return selected ? (
                  <p className="mt-1.5 text-xs text-stone">{selected.description}</p>
                ) : <></>;
              }}
            />
          </div>

          {/* Group — segmented type + inline size */}
          <div className="rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-brand-primary/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-stone" />
                <p className="text-sm font-medium text-foreground">Group</p>
              </div>
              <Controller
                control={control}
                name="groupType"
                render={({ field }) => (
                  <div className="flex rounded-lg border border-border bg-background p-0.5">
                    {GROUP_TYPE_SEGMENTS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(field.value === option.value ? "" : option.value)}
                        className={cn(
                          "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                          field.value === option.value
                            ? "bg-brand-primary text-white shadow-[var(--shadow-sm)]"
                            : "text-stone hover:text-foreground"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
            {(formValues.groupType === "family" || formValues.groupType === "friends") && (
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="group-size-inline" className="text-xs text-stone">Adults</label>
                  <Input
                    id="group-size-inline"
                    type="number"
                    min={1}
                    max={20}
                    placeholder="2"
                    className="h-8 w-16 min-h-0 text-center text-xs"
                    {...register("groupSize", { valueAsNumber: true })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="children-ages-inline" className="text-xs text-stone whitespace-nowrap">Kids ages</label>
                  <Input
                    id="children-ages-inline"
                    placeholder="5, 8"
                    className="h-8 w-24 min-h-0 text-xs"
                    {...register("childrenAges")}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Access — mobility toggle + dietary pills */}
          <div className="rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-brand-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Accessibility className="h-4 w-4 text-stone" />
                <p className="text-sm font-medium text-foreground">Mobility assistance</p>
              </div>
              <button
                type="button"
                onClick={() => setValue("mobilityAssistance", !formValues.mobilityAssistance)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  formValues.mobilityAssistance ? "bg-brand-primary" : "bg-border"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-[var(--shadow-sm)]",
                    formValues.mobilityAssistance && "translate-x-5"
                  )}
                />
              </button>
            </div>
            <div className="mt-2.5">
              <p className="mb-1.5 text-xs text-stone">Dietary</p>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_OPTIONS.filter((o) => o.id !== "other").map((option) => {
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
                        "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                          : "border-border text-stone hover:text-foreground-secondary"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const current = formValues.dietary ?? [];
                    const has = current.includes("other");
                    setValue("dietary", has ? current.filter((id) => id !== "other") : [...current, "other"]);
                  }}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                    formValues.dietary?.includes("other")
                      ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                      : "border-border text-stone hover:text-foreground-secondary"
                  )}
                >
                  Other
                </button>
              </div>
              {formValues.dietary?.includes("other") && (
                <Input
                  id="dietary-other-inline"
                  placeholder="Please specify..."
                  className="mt-2 h-8 min-h-0 text-xs"
                  {...register("dietaryOther")}
                />
              )}
            </div>
          </div>

          {/* Duration Warning */}
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
                {durationWarning.severity === "warning" ? "\u26A0\uFE0F" : "\u2139\uFE0F"}
              </span>
              <p className="text-sm text-foreground-secondary">{durationWarning.message}</p>
            </div>
          )}

          {/* Festival near-miss card (C10) */}
          <FestivalNearMissCard />

          {/* Budget & Notes */}
          <PreferenceCard
              icon={<Wallet className="h-5 w-5" />}
              title={sanityConfig?.reviewBudgetTitle ?? "Budget"}
              optional
              hasValue={budgetValue !== undefined}
              summary={budgetValue ? `¥${budgetValue.amount.toLocaleString()}/${budgetValue.mode === "perDay" ? "day" : "total"}` : undefined}
            >
              <BudgetInput
                id="budget-input"
                duration={data.duration}
                value={budgetValue}
                onChange={handleBudgetChange}
                onModeChange={setBudgetMode}
              />
            </PreferenceCard>

            <PreferenceCard
              icon={<StickyNote className="h-5 w-5" />}
              title={sanityConfig?.reviewNotesTitle ?? "Notes"}
              optional
              hasValue={!!formValues.additionalNotes?.trim()}
              summary={formValues.additionalNotes?.trim() ? `${formValues.additionalNotes.trim().slice(0, 30)}${formValues.additionalNotes.trim().length > 30 ? "..." : ""}` : undefined}
            >
              <textarea
                id="additional-notes"
                placeholder={sanityConfig?.reviewNotesPlaceholder ?? "Birthday dinner in Kyoto, must see Fushimi Inari, need wheelchair access..."}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-base placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                rows={4}
                {...register("additionalNotes")}
              />
            </PreferenceCard>
        </div>
      </div>

    </div>
  );
}

