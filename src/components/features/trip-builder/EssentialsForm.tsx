"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { DatePicker } from "@/components/ui/DatePicker";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { EntryPointSelector } from "./EntryPointSelector";
import type { EntryPoint } from "@/types/trip";

type EssentialsFormValues = {
  start?: string;
  end?: string;
};

const DAY_START_OPTIONS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
] as const;

const DEFAULT_DAY_START = "09:00";

export type EssentialsFormProps = {
  onValidityChange?: (isValid: boolean) => void;
};

const MIN_DURATION = 1;
const MAX_DURATION = 14;

export function EssentialsForm({ onValidityChange }: EssentialsFormProps) {
  const { data, setData } = useTripBuilder();

  const formValues = useMemo<EssentialsFormValues>(
    () => ({
      start: data.dates.start ?? "",
      end: data.dates.end ?? "",
    }),
    [data.dates.start, data.dates.end]
  );

  const {
    control,
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
  const endValue = useWatch({ control, name: "end" });

  // Calculate duration from start and end dates
  const calculatedDuration = useMemo(() => {
    if (!startValue || !endValue) {
      return null;
    }
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
    return diffDays;
  }, [startValue, endValue]);

  // Calculate minimum end date (must be same day or after start)
  const minEndDate = useMemo(() => {
    if (!startValue) return undefined;
    return startValue;
  }, [startValue]);

  // Calculate maximum end date (14 days from start)
  const maxEndDate = useMemo(() => {
    if (!startValue) return undefined;
    const startDate = new Date(startValue);
    const maxDate = new Date(startDate);
    maxDate.setDate(startDate.getDate() + MAX_DURATION - 1);
    return maxDate.toISOString().split("T")[0];
  }, [startValue]);

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

  // Handle day start time change
  const handleDayStartTimeChange = useCallback(
    (time: string) => {
      setData((prev) => ({
        ...prev,
        dayStartTime: time,
      }));
    },
    [setData]
  );

  // Get current day start time (default to 9:00 AM if not set)
  const currentDayStartTime = data.dayStartTime ?? DEFAULT_DAY_START;

  // Sync form values to context on change
  useEffect(() => {
    const duration = calculatedDuration && calculatedDuration >= MIN_DURATION && calculatedDuration <= MAX_DURATION
      ? calculatedDuration
      : undefined;

    setData((prev) => ({
      ...prev,
      duration,
      dates: {
        ...prev.dates,
        start: startValue,
        end: endValue,
      },
    }));
  }, [calculatedDuration, startValue, endValue, setData]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-charcoal">Trip Essentials</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          Set the basics for your Japan adventure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <Controller
          control={control}
          name="end"
          rules={{
            required: "End date is required",
            validate: (value) => {
              if (!value || !startValue) return true;
              const start = new Date(startValue);
              const end = new Date(value);
              if (end < start) {
                return "End date must be after start date";
              }
              const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              if (diffDays > MAX_DURATION) {
                return `Maximum trip duration is ${MAX_DURATION} days`;
              }
              return true;
            },
          }}
          render={({ field }) => (
            <DatePicker
              id="trip-end"
              label="End Date"
              required
              value={field.value ?? ""}
              onChange={field.onChange}
              error={errors.end?.message}
              min={minEndDate}
              max={maxEndDate}
            />
          )}
        />
      </div>

      {calculatedDuration !== null && calculatedDuration >= MIN_DURATION && calculatedDuration <= MAX_DURATION && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-sm text-foreground-secondary">
            <span className="mr-2">📅</span>
            <span className="font-medium text-charcoal">
              {calculatedDuration}-day trip
            </span>
            {" "}({calculatedDuration - 1} night{calculatedDuration - 1 !== 1 ? "s" : ""})
          </p>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-charcoal">Entry Point (Optional)</h4>
        <p className="mt-1 mb-3 text-xs text-stone">
          Where will you start your trip? Search for airports, train stations, cities, or hotels.
        </p>
        <EntryPointSelector
          value={data.entryPoint}
          onChange={handleEntryPointChange}
        />
      </div>

      <div>
        <h4 className="text-sm font-medium text-charcoal">Day Start Time</h4>
        <p className="mt-1 mb-3 text-xs text-stone">
          What time do you plan to start each day?
        </p>
        <div className="flex flex-wrap gap-2">
          {DAY_START_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleDayStartTimeChange(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                currentDayStartTime === option.value
                  ? "bg-sage text-white"
                  : "bg-surface text-charcoal hover:bg-sage/10 border border-border"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
