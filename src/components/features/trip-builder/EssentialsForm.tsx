"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { EntryPointSelector } from "./EntryPointSelector";
import type { EntryPoint } from "@/types/trip";

type EssentialsFormValues = {
  duration?: number;
  start?: string;
  budgetTotal?: number;
  budgetPerDay?: number;
  budgetLevel?: "budget" | "moderate" | "luxury" | "";
};

export type EssentialsFormProps = {
  onValidityChange?: (isValid: boolean) => void;
};

const MIN_DURATION = 1;
const MAX_DURATION = 14;

export function EssentialsForm({ onValidityChange }: EssentialsFormProps) {
  const { data, setData } = useTripBuilder();

  const formValues = useMemo<EssentialsFormValues>(
    () => ({
      duration: data.duration ?? undefined,
      start: data.dates.start ?? "",
      budgetTotal: data.budget?.total ?? undefined,
      budgetPerDay: data.budget?.perDay ?? undefined,
      budgetLevel: data.budget?.level ?? "",
    }),
    [
      data.duration,
      data.dates.start,
      data.budget?.total,
      data.budget?.perDay,
      data.budget?.level,
    ]
  );

  const {
    control,
    register,
    formState: { errors, isValid },
  } = useForm<EssentialsFormValues>({
    values: formValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const startValue = useWatch({ control, name: "start" });
  const durationValue = useWatch({ control, name: "duration" });
  const budgetTotal = useWatch({ control, name: "budgetTotal" });
  const budgetPerDay = useWatch({ control, name: "budgetPerDay" });
  const budgetLevel = useWatch({ control, name: "budgetLevel" });

  // Calculate end date from start date and duration
  const calculatedEndDate = useMemo(() => {
    if (!startValue || !durationValue || durationValue < 1) {
      return null;
    }
    const duration = Math.floor(durationValue);
    const startDate = new Date(startValue);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration - 1);
    return endDate.toISOString().split("T")[0];
  }, [startValue, durationValue]);

  // Format end date for display
  const formattedEndDate = useMemo(() => {
    if (!calculatedEndDate) return null;
    const date = new Date(calculatedEndDate);
    const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
    return formatter.format(date);
  }, [calculatedEndDate]);

  // Handle entry point change from EntryPointSelector
  const handleEntryPointChange = useCallback(
    (entryPoint: EntryPoint | undefined) => {
      setData((prev) => ({
        ...prev,
        entryPoint,
      }));
    },
    [setData]
  );

  // Sync form values to context on change
  useEffect(() => {
    let endDate = "";
    if (startValue && durationValue && durationValue >= 1) {
      const duration = Math.floor(durationValue);
      const startDate = new Date(startValue);
      const calculatedEnd = new Date(startDate);
      calculatedEnd.setDate(startDate.getDate() + duration - 1);
      const [isoDate] = calculatedEnd.toISOString().split("T");
      if (isoDate) {
        endDate = isoDate;
      }
    }

    setData((prev) => ({
      ...prev,
      duration: durationValue,
      dates: {
        ...prev.dates,
        start: startValue,
        end: endDate,
      },
      budget: {
        total: budgetTotal,
        perDay: budgetPerDay,
        level: budgetLevel ? (budgetLevel as "budget" | "moderate" | "luxury") : undefined,
      },
    }));
  }, [
    durationValue,
    startValue,
    budgetTotal,
    budgetPerDay,
    budgetLevel,
    setData,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Trip Essentials</h3>
        <p className="mt-1 text-sm text-gray-600">
          Set the basics for your Japan adventure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="trip-duration"
          label="Duration"
          required
          help="1-14 days"
          error={errors.duration?.message}
        >
          <Input
            id="trip-duration"
            type="number"
            min={MIN_DURATION}
            max={MAX_DURATION}
            inputMode="numeric"
            placeholder="Days"
            className="min-h-[44px]"
            {...register("duration", {
              valueAsNumber: true,
              required: "Duration is required",
              min: { value: MIN_DURATION, message: "Minimum 1 day" },
              max: { value: MAX_DURATION, message: "Maximum 14 days" },
              validate: (value) => {
                if (value === undefined || Number.isNaN(value)) {
                  return "Duration is required";
                }
                if (!Number.isInteger(value)) {
                  return "Must be a whole number";
                }
                return true;
              },
            })}
          />
        </FormField>

        <Controller
          control={control}
          name="start"
          rules={{ required: "Start date is required" }}
          render={({ field }) => (
            <DatePicker
              id="trip-start"
              label="Start Date"
              required
              value={field.value ?? ""}
              onChange={field.onChange}
              error={errors.start?.message}
            />
          )}
        />
      </div>

      {calculatedEndDate && formattedEndDate && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">End date:</span> {formattedEndDate} (
            {Math.floor(durationValue || 0)} day{durationValue === 1 ? "" : "s"})
          </p>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-900">Entry Point (Optional)</h4>
        <p className="mt-1 mb-3 text-xs text-gray-500">
          Where will you start your trip? Search for airports, train stations, cities, or hotels.
        </p>
        <EntryPointSelector
          value={data.entryPoint}
          onChange={handleEntryPointChange}
        />
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900">Budget (Optional)</h4>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField id="budget-level" label="Level" error={errors.budgetLevel?.message}>
            <Controller
              control={control}
              name="budgetLevel"
              render={({ field }) => (
                <Select
                  id="budget-level"
                  placeholder="Select"
                  options={[
                    { label: "Budget", value: "budget" },
                    { label: "Moderate", value: "moderate" },
                    { label: "Luxury", value: "luxury" },
                  ]}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? undefined : val);
                  }}
                />
              )}
            />
          </FormField>

          <FormField id="budget-total" label="Total (¥)" error={errors.budgetTotal?.message}>
            <Input
              id="budget-total"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="50000"
              className="min-h-[44px]"
              {...register("budgetTotal", {
                valueAsNumber: true,
                min: { value: 0, message: "Cannot be negative" },
              })}
            />
          </FormField>

          <FormField id="budget-per-day" label="Per Day (¥)" error={errors.budgetPerDay?.message}>
            <Input
              id="budget-per-day"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="5000"
              className="min-h-[44px]"
              {...register("budgetPerDay", {
                valueAsNumber: true,
                min: { value: 0, message: "Cannot be negative" },
              })}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}
