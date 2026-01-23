"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { AccommodationStyle, TripStyle, TransportMode } from "@/types/trip";

type PreferenceFormValues = {
  // Group composition
  groupSize?: number;
  groupType?: "solo" | "couple" | "family" | "friends" | "business" | "";
  childrenAges?: string;
  // Accommodation
  accommodationStyle?: AccommodationStyle | "";
  // Transportation
  walkingTolerance?: number;
  preferTrain?: boolean;
  preferBus?: boolean;
  hasRentalCar?: boolean;
  // Travel pace
  travelStyle?: TripStyle | "";
  // Accessibility & Dietary
  mobilityAssistance?: boolean;
  dietary?: string[];
  dietaryOther?: string;
  // Weather
  preferIndoorOnRain?: boolean;
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

const ACCOMMODATION_OPTIONS = [
  { label: "Ryokan (Traditional)", value: "ryokan" },
  { label: "Budget Hotels", value: "budget" },
  { label: "Mid-Range Hotels", value: "midrange" },
  { label: "Luxury Hotels", value: "luxury" },
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

  const defaultValues = useMemo<PreferenceFormValues>(
    () => ({
      groupSize: data.group?.size,
      groupType: data.group?.type ?? "",
      childrenAges: data.group?.childrenAges?.join(", ") ?? "",
      accommodationStyle: data.accommodationStyle ?? "",
      walkingTolerance: data.transportPreferences?.walkingTolerance,
      preferTrain: data.transportPreferences?.preferredModes?.includes("train"),
      preferBus: data.transportPreferences?.preferredModes?.includes("bus"),
      hasRentalCar: data.transportPreferences?.hasRentalCar,
      travelStyle: data.style ?? "",
      mobilityAssistance: data.accessibility?.mobility,
      dietary: data.accessibility?.dietary ?? [],
      dietaryOther: data.accessibility?.dietaryOther ?? "",
      preferIndoorOnRain: data.weatherPreferences?.preferIndoorOnRain,
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

  // Sync form values to context
  const syncToContext = useCallback(() => {
    const preferredModes: TransportMode[] = [];
    if (formValues.preferTrain) preferredModes.push("train");
    if (formValues.preferBus) preferredModes.push("bus");
    if (formValues.hasRentalCar) preferredModes.push("car");

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
      accommodationStyle: formValues.accommodationStyle ? (formValues.accommodationStyle as AccommodationStyle) : undefined,
      transportPreferences: {
        walkingTolerance: formValues.walkingTolerance,
        preferredModes: preferredModes.length > 0 ? preferredModes : undefined,
        hasRentalCar: formValues.hasRentalCar,
      },
      style: formValues.travelStyle ? (formValues.travelStyle as TripStyle) : undefined,
      accessibility: {
        mobility: formValues.mobilityAssistance,
        dietary: formValues.dietary,
        dietaryOther: formValues.dietaryOther,
        notes: formValues.additionalNotes,
      },
      weatherPreferences: {
        ...prev.weatherPreferences,
        preferIndoorOnRain: formValues.preferIndoorOnRain,
      },
    }));
  }, [formValues, setData]);

  // Sync on form value changes
  useEffect(() => {
    syncToContext();
    onValidityChange?.(true); // Step 2 is always valid (preferences are optional)
  }, [syncToContext, onValidityChange]);

  return (
    <div className="flex flex-col gap-6">
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
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                    field.value === option.value
                      ? "border-indigo-200 bg-indigo-50 ring-1 ring-indigo-500"
                      : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 h-4 w-4 rounded-full border-2 transition",
                      field.value === option.value
                        ? "border-indigo-600 bg-indigo-600"
                        : "border-gray-300"
                    )}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {option.label}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
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
        <div className="grid grid-cols-2 gap-4">
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
              placeholder="Number of travelers"
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

      {/* Accommodation Style */}
      <PreferenceCard
        title="Accommodation Style"
        description="What type of accommodation do you prefer?"
      >
        <Controller
          control={control}
          name="accommodationStyle"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {ACCOMMODATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    field.onChange(field.value === option.value ? "" : option.value)
                  }
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    field.value === option.value
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        />
      </PreferenceCard>

      {/* Transportation Preferences */}
      <PreferenceCard
        title="Transportation"
        description="How do you prefer to get around?"
      >
        <FormField
          id="walking-tolerance"
          label="Walking Tolerance (meters)"
          help="Maximum comfortable walking distance"
        >
          <Input
            id="walking-tolerance"
            type="number"
            min={0}
            max={10000}
            step={100}
            placeholder="e.g., 1000"
            className="min-h-[40px]"
            {...register("walkingTolerance", { valueAsNumber: true })}
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              {...register("preferTrain")}
            />
            <span className="text-sm text-gray-700">Prefer trains</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              {...register("preferBus")}
            />
            <span className="text-sm text-gray-700">Prefer buses</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              {...register("hasRentalCar")}
            />
            <span className="text-sm text-gray-700">I have a rental car</span>
          </label>
        </div>
      </PreferenceCard>

      {/* Accessibility & Dietary */}
      <PreferenceCard
        title="Accessibility & Dietary"
        description="Any special requirements we should consider?"
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            {...register("mobilityAssistance")}
          />
          <span className="text-sm text-gray-700">Need mobility assistance</span>
        </label>

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
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
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  {...register("dietary")}
                />
                <span className="text-sm text-gray-700">{option.label}</span>
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

      {/* Weather Preferences */}
      <PreferenceCard
        title="Weather Preferences"
        description="How should we plan around weather?"
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            {...register("preferIndoorOnRain")}
          />
          <span className="text-sm text-gray-700">
            Prefer indoor activities on rainy days
          </span>
        </label>
      </PreferenceCard>

      {/* Additional Notes */}
      <PreferenceCard
        title="Additional Notes"
        description="Anything else we should know?"
      >
        <textarea
          id="additional-notes"
          placeholder="Special requests, specific places you want to visit, etc."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          rows={3}
          {...register("additionalNotes")}
        />
      </PreferenceCard>
    </div>
  );
}

type PreferenceCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function PreferenceCard({ title, description, children }: PreferenceCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
