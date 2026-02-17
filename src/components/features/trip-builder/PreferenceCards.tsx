"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { BudgetInput, type BudgetMode, type BudgetValue } from "./BudgetInput";
import type { TripStyle } from "@/types/trip";

type PreferenceFormValues = {
  // Group composition
  groupSize?: number;
  groupType?: "solo" | "couple" | "family" | "friends" | "business" | "";
  childrenAges?: string;
  // Travel pace
  travelStyle?: TripStyle | "";
  // Accessibility & Dietary
  mobilityAssistance?: boolean;
  dietary?: string[];
  dietaryOther?: string;
  // Notes
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
  { label: "Relaxed", value: "relaxed", description: "Slow mornings, gentle pacing" },
  { label: "Balanced", value: "balanced", description: "Mix of highlights and downtime" },
  { label: "Fast", value: "fast", description: "Packed schedules, see everything" },
];

export type PreferenceCardsProps = {
  onValidityChange?: (isValid: boolean) => void;
};

export function PreferenceCards({ onValidityChange }: PreferenceCardsProps) {
  const { data, setData } = useTripBuilder();

  // Budget mode is tracked locally (UI state), while values are stored in context
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("perDay");

  // Budget state (managed separately from react-hook-form)
  const budgetValue = useMemo<BudgetValue | undefined>(() => {
    const perDay = data.budget?.perDay;
    const total = data.budget?.total;

    // Return the appropriate amount based on current mode
    if (budgetMode === "perDay" && perDay !== undefined) {
      return { amount: perDay, mode: "perDay" };
    }
    if (budgetMode === "total" && total !== undefined) {
      return { amount: total, mode: "total" };
    }
    // Fallback: if we have either value, show something
    if (perDay !== undefined) {
      return { amount: perDay, mode: "perDay" };
    }
    if (total !== undefined) {
      return { amount: total, mode: "total" };
    }
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

  // Watch all form values for real-time sync
  const formValues = useWatch({ control });

  // Handle budget change from BudgetInput
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
    // Parse children ages
    const childrenAges = formValues.childrenAges
      ?.split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n)) ?? [];

    setData((prev) => ({
      ...prev,
      group: {
        size: formValues.groupSize,
        type: formValues.groupType ? (formValues.groupType as "solo" | "couple" | "family" | "friends" | "business") : undefined,
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

  // Sync on form value changes
  useEffect(() => {
    syncToContext();
    onValidityChange?.(true); // Step 2 is always valid (preferences are optional)
  }, [syncToContext, onValidityChange]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
      {/* Budget */}
      <PreferenceCard title="Budget" description="Set your travel budget (optional)">
        <BudgetInput
          id="budget"
          duration={data.duration}
          value={budgetValue}
          onChange={handleBudgetChange}
          onModeChange={setBudgetMode}
        />
      </PreferenceCard>

      {/* Travel Pace */}
      <PreferenceCard title="Travel Pace" description="How do you like to travel?">
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
      </PreferenceCard>

      {/* Group Composition */}
      <PreferenceCard
        title="Group Composition"
        description="Tell us about your travel group"
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
      </PreferenceCard>

      {/* Accessibility & Dietary */}
      <PreferenceCard
        title="Accessibility & Dietary"
        description="Any special requirements we should consider?"
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
            {...register("mobilityAssistance")}
          />
          <span className="text-sm text-foreground-secondary">Need mobility assistance</span>
        </label>

        <div className="mt-2">
          <p className="text-sm font-medium text-foreground-secondary mb-2">
            Dietary Restrictions
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DIETARY_OPTIONS.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 cursor-pointer"
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
      </PreferenceCard>

      {/* Additional Notes */}
      <PreferenceCard
        title="Additional Notes"
        description="Anything else we should know?"
      >
        <textarea
          id="additional-notes"
          placeholder="A birthday dinner in Kyoto, avoiding steep stairs, must-see spots..."
          className="w-full rounded-xl border border-border px-3 py-2 text-sm placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          rows={4}
          {...register("additionalNotes")}
        />
      </PreferenceCard>
    </div>
  );
}

type PreferenceCardProps = {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
};

function PreferenceCard({ title, description, className, children }: PreferenceCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-background p-4", className)}>
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {description && (
          <p className="mt-0.5 text-xs text-stone">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
