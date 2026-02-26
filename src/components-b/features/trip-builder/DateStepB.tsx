"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { motion } from "framer-motion";

import { DatePicker } from "@/components/ui/DatePicker";
import { useTripBuilder } from "@/context/TripBuilderContext";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type DateFormValues = {
  start?: string;
  end?: string;
};

const MIN_DURATION = 1;
const MAX_DURATION = 14;

export type DateStepBProps = {
  onValidityChange?: (isValid: boolean) => void;
  sanityConfig?: TripBuilderConfig;
};

export function DateStepB({ onValidityChange, sanityConfig }: DateStepBProps) {
  const { data, setData } = useTripBuilder();

  const formValues = useMemo<DateFormValues>(
    () => ({
      start: data.dates.start ?? "",
      end: data.dates.end ?? "",
    }),
    [data.dates.start, data.dates.end],
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

  const calculatedDuration = useMemo(() => {
    if (!startValue || !endValue) return null;
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [startValue, endValue]);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const minEndDate = useMemo(() => {
    if (!startValue) return today;
    return startValue;
  }, [startValue, today]);

  const maxEndDate = useMemo(() => {
    if (!startValue) return undefined;
    const startDate = new Date(startValue);
    const maxDate = new Date(startDate);
    maxDate.setDate(startDate.getDate() + MAX_DURATION - 1);
    return maxDate.toISOString().split("T")[0];
  }, [startValue]);

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
    <div className="flex flex-1 flex-col justify-center">
      <div className="mx-auto w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Step 01
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl"
        >
          {sanityConfig?.dateStepHeading ?? "When are you going?"}
        </motion.h2>

        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {sanityConfig?.dateStepDescription ??
            "Your dates shape everything \u2014 cherry blossoms, festivals, fall foliage. Up to 14 days."}
        </p>

        <div className="mt-8 flex flex-col gap-6">
          <Controller
            control={control}
            name="start"
            rules={{ required: "Start date is required" }}
            render={({ field }) => (
              <DatePicker
                id="trip-start-b"
                label={sanityConfig?.dateStepStartLabel ?? "Start Date"}
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
                if (end < start) return "End date must be after start date";
                const diffDays =
                  Math.round(
                    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
                  ) + 1;
                if (diffDays > MAX_DURATION) {
                  return `Maximum trip duration is ${MAX_DURATION} days`;
                }
                return true;
              },
            }}
            render={({ field }) => (
              <DatePicker
                id="trip-end-b"
                label={sanityConfig?.dateStepEndLabel ?? "End Date"}
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
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: bEase }}
              className="mt-6"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-[var(--primary)]">
                {calculatedDuration} days &middot;{" "}
                {calculatedDuration - 1} night
                {calculatedDuration - 1 !== 1 ? "s" : ""}
              </p>
            </motion.div>
          )}
      </div>
    </div>
  );
}
