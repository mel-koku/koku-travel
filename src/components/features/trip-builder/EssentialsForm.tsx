"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { EntryPointSelector } from "./EntryPointSelector";
import { BudgetInput, type BudgetMode, type BudgetValue } from "./BudgetInput";
import type { EntryPoint } from "@/types/trip";

type EssentialsFormValues = {
  duration?: number;
  start?: string;
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
    }),
    [data.duration, data.dates.start]
  );

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
    }));
  }, [durationValue, startValue, setData]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-charcoal">Trip Essentials</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
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
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-sm text-foreground-secondary">
            <span className="font-medium text-charcoal">End date:</span> {formattedEndDate} (
            {Math.floor(durationValue || 0)} day{durationValue === 1 ? "" : "s"})
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
        <h4 className="text-sm font-medium text-charcoal">Budget (Optional)</h4>
        <div className="mt-3">
          <BudgetInput
            id="budget"
            duration={durationValue}
            value={budgetValue}
            onChange={handleBudgetChange}
            onModeChange={setBudgetMode}
          />
        </div>
      </div>
    </div>
  );
}
