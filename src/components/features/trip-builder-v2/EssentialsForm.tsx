"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { getAllEntryPoints, getEntryPointsByType } from "@/data/entryPoints";
import type { EntryPointType } from "@/types/trip";

type EssentialsFormValues = {
  duration?: number;
  start?: string;
  entryPointType?: EntryPointType | "";
  entryPointId?: string;
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
      entryPointType: data.entryPoint?.type ?? "",
      entryPointId: data.entryPoint?.id ?? "",
      budgetTotal: data.budget?.total ?? undefined,
      budgetPerDay: data.budget?.perDay ?? undefined,
      budgetLevel: data.budget?.level ?? "",
    }),
    [
      data.duration,
      data.dates.start,
      data.entryPoint?.type,
      data.entryPoint?.id,
      data.budget?.total,
      data.budget?.perDay,
      data.budget?.level,
    ]
  );

  const {
    control,
    register,
    setValue,
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
  const entryPointType = useWatch({ control, name: "entryPointType" });
  const entryPointId = useWatch({ control, name: "entryPointId" });
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

  // Sync form values to context on change
  useEffect(() => {
    let entryPoint = undefined;
    if (entryPointType && entryPointId) {
      const allPoints = getAllEntryPoints();
      entryPoint = allPoints.find((ep) => ep.id === entryPointId);
    }

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
      entryPoint,
      budget: {
        total: budgetTotal,
        perDay: budgetPerDay,
        level: budgetLevel ? (budgetLevel as "budget" | "moderate" | "luxury") : undefined,
      },
    }));
  }, [
    durationValue,
    startValue,
    entryPointType,
    entryPointId,
    budgetTotal,
    budgetPerDay,
    budgetLevel,
    setData,
  ]);

  const entryPointOptions = useMemo(() => {
    if (!entryPointType) {
      return [];
    }
    const isValidType = (val: string | undefined): val is EntryPointType => {
      return val === "airport" || val === "city" || val === "hotel" || val === "station";
    };
    if (!isValidType(entryPointType)) {
      return [];
    }
    try {
      const points = getEntryPointsByType(entryPointType);
      return points.map((ep) => ({
        label: ep.name,
        value: ep.id,
      }));
    } catch {
      return [];
    }
  }, [entryPointType]);

  const entryPointTypeOptions = useMemo(
    () => [
      { label: "Airport", value: "airport" },
      { label: "Train Station", value: "station" },
      { label: "City", value: "city" },
      { label: "Hotel", value: "hotel" },
    ],
    []
  );

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="entryPointType"
          render={({ field }) => (
            <FormField id="entry-point-type" label="Entry Point Type">
              <Select
                id="entry-point-type"
                placeholder="Select type"
                options={entryPointTypeOptions}
                value={field.value ?? ""}
                onChange={(e) => {
                  const newValue = e.target.value || undefined;
                  field.onChange(newValue);
                  setValue("entryPointId", undefined);
                }}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="entryPointId"
          render={({ field }) => (
            <FormField
              id="entry-point"
              label="Entry Point"
              help={entryPointType ? undefined : "Select type first"}
            >
              <Select
                id="entry-point"
                placeholder={entryPointType ? "Select entry point" : "Select type first"}
                options={entryPointOptions}
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? undefined : val);
                }}
                disabled={!entryPointType}
              />
            </FormField>
          )}
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
