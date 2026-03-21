"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { motion, useReducedMotion } from "framer-motion";

import { DatePicker } from "@/components/ui/DatePicker";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { parseLocalDate, parseLocalDateWithOffset } from "@/lib/utils/dateUtils";
import { cEase } from "@c/ui/motionC";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

type DateFormValues = {
  start?: string;
  end?: string;
};

const MIN_DURATION = 1;
const MAX_DURATION = 14;

export type DateStepCProps = {
  onValidityChange?: (isValid: boolean) => void;
  sanityConfig?: TripBuilderConfig;
};

export function DateStepC({ onValidityChange, sanityConfig }: DateStepCProps) {
  const prefersReducedMotion = useReducedMotion();
  const { data, setData } = useTripBuilder();

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const formValues = useMemo<DateFormValues>(
    () => ({
      start: data.dates.start || todayStr,
      end: data.dates.end ?? "",
    }),
    [data.dates.start, data.dates.end, todayStr],
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
    const startDate = parseLocalDate(startValue);
    const endDate = parseLocalDate(endValue);
    if (!startDate || !endDate) return null;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [startValue, endValue]);

  const today = todayStr;

  const minEndDate = useMemo(() => {
    if (!startValue) return today;
    return startValue;
  }, [startValue, today]);

  const maxEndDate = useMemo(() => {
    if (!startValue) return undefined;
    const maxDate = parseLocalDateWithOffset(startValue, MAX_DURATION - 1);
    if (!maxDate) return undefined;
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
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Step 01
        </p>

        <motion.h2
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: cEase, delay: 0.1 }}
          className="mt-4 text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl"
          style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
        >
          {sanityConfig?.dateStepHeading ?? "When are you going?"}
        </motion.h2>

        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {sanityConfig?.dateStepDescription ??
            "Your dates shape everything: cherry blossoms, festivals, fall foliage. Up to 14 days."}
        </p>

        <div className="mt-8 flex flex-col gap-6">
          <Controller
            control={control}
            name="start"
            rules={{ required: "Start date is required" }}
            render={({ field }) => (
              <DatePicker
                id="trip-start-c"
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
                const start = parseLocalDate(startValue);
                const end = parseLocalDate(value);
                if (!start || !end) return true;
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
                id="trip-end-c"
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
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: cEase }}
              className="mt-6"
              aria-live="polite"
            >
              <p className="text-sm font-bold text-[var(--primary)]">
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
