"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { DatePicker } from "@/components/ui/DatePicker";
import { useTripBuilder } from "@/context/TripBuilderContext";

type DateFormValues = {
  start?: string;
  end?: string;
};

const MIN_DURATION = 1;
const MAX_DURATION = 14;

export type DateStepProps = {
  onValidityChange?: (isValid: boolean) => void;
};

export function DateStep({ onValidityChange }: DateStepProps) {
  const { data, setData } = useTripBuilder();

  const formValues = useMemo<DateFormValues>(
    () => ({
      start: data.dates.start ?? "",
      end: data.dates.end ?? "",
    }),
    [data.dates.start, data.dates.end]
  );

  const {
    control,
    formState: { errors, isValid },
  } = useForm<DateFormValues>({
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

  // Today's date as minimum for start date
  const today = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Calculate minimum end date (must be same day or after start)
  const minEndDate = useMemo(() => {
    if (!startValue) return today;
    return startValue;
  }, [startValue, today]);

  // Calculate maximum end date (14 days from start)
  const maxEndDate = useMemo(() => {
    if (!startValue) return undefined;
    const startDate = new Date(startValue);
    const maxDate = new Date(startDate);
    maxDate.setDate(startDate.getDate() + MAX_DURATION - 1);
    return maxDate.toISOString().split("T")[0];
  }, [startValue]);

  // Sync form values to context on change
  const syncDates = useCallback(() => {
    const duration =
      calculatedDuration &&
      calculatedDuration >= MIN_DURATION &&
      calculatedDuration <= MAX_DURATION
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

  useEffect(() => {
    syncDates();
  }, [syncDates]);

  return (
    <div className="flex flex-col gap-4">
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
              min={today}
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
              const diffDays =
                Math.round(
                  (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;
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

      {calculatedDuration !== null &&
        calculatedDuration >= MIN_DURATION &&
        calculatedDuration <= MAX_DURATION && (
          <div className="rounded-lg border border-sage/20 bg-sage/5 px-4 py-3">
            <p className="text-sm text-foreground-secondary">
              <span className="font-medium text-charcoal">
                {calculatedDuration}-day trip
              </span>{" "}
              ({calculatedDuration - 1} night
              {calculatedDuration - 1 !== 1 ? "s" : ""})
            </p>
          </div>
        )}
    </div>
  );
}
