"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { motion } from "framer-motion";

import { DatePicker } from "@/components/ui/DatePicker";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { durationFast, easeReveal } from "@/lib/motion";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

type DateFormValues = {
  start?: string;
  end?: string;
};

const MIN_DURATION = 1;
const MAX_DURATION = 14;

export type DateStepProps = {
  onValidityChange?: (isValid: boolean) => void;
  sanityConfig?: TripBuilderConfig;
};

export function DateStep({ onValidityChange, sanityConfig }: DateStepProps) {
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
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Left half — Visual (hidden on mobile, shown on lg+) */}
      <div className="relative hidden w-1/2 overflow-hidden rounded-xl lg:block">
        <motion.div
          className="absolute inset-0"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
        >
          <Image
            src={sanityConfig?.dateStepBackgroundImage?.url ?? "/images/regions/kansai-hero.jpg"}
            alt=""
            fill
            className="object-cover"
            sizes="50vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-l from-charcoal via-charcoal/60 to-transparent" />
      </div>

      {/* Right half — Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-8 lg:w-1/2 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-primary">
            STEP 01
          </p>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeReveal, delay: 0.15 }}
            className="mt-3 font-serif text-3xl italic tracking-tight text-foreground"
          >
            {sanityConfig?.dateStepHeading ?? "When are you going?"}
          </motion.h2>

          <p className="mt-2 text-sm text-stone">
            {sanityConfig?.dateStepDescription ?? "Your dates shape everything \u2014 cherry blossoms, festivals, fall foliage. Up to 14 days."}
          </p>

          <div className="mt-8 flex flex-col gap-6">
            <Controller
              control={control}
              name="start"
              rules={{ required: "Start date is required" }}
              render={({ field }) => (
                <DatePicker
                  id="trip-start"
                  label={sanityConfig?.dateStepStartLabel ?? "Start Date"}
                  required
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={errors.start?.message}
                  min={today}
                  aria-describedby={errors.start?.message ? "start-error" : undefined}
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
                  label={sanityConfig?.dateStepEndLabel ?? "End Date"}
                  required
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={errors.end?.message}
                  min={minEndDate}
                  max={maxEndDate}
                  aria-describedby={errors.end?.message ? "end-error" : undefined}
                />
              )}
            />
          </div>

          {/* Duration stat */}
          {calculatedDuration !== null &&
            calculatedDuration >= MIN_DURATION &&
            calculatedDuration <= MAX_DURATION && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: durationFast, ease: easeReveal }}
                className="mt-6"
                aria-live="polite"
              >
                <p className="font-mono text-sm text-sage">
                  {calculatedDuration} days &middot;{" "}
                  {calculatedDuration - 1} night
                  {calculatedDuration - 1 !== 1 ? "s" : ""}
                </p>
              </motion.div>
            )}
        </div>
      </div>
    </div>
  );
}
