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

type Step1FormValues = {
  duration?: number;
  start?: string;
  entryPointType?: EntryPointType | "";
  entryPointId?: string;
  budgetTotal?: number;
  budgetPerDay?: number;
  budgetLevel?: "budget" | "moderate" | "luxury" | "";
};

export type Step1BasicInfoProps = {
  formId: string;
  onNext: () => void;
  onValidityChange: (isValid: boolean) => void;
};

const MIN_DURATION = 1;
const MAX_DURATION = 14;

export function Step1BasicInfo({ formId, onNext, onValidityChange }: Step1BasicInfoProps) {
  const { data, setData } = useTripBuilder();

  const formValues = useMemo<Step1FormValues>(
    () => ({
      duration: data.duration ?? undefined,
      start: data.dates.start ?? "",
      entryPointType: data.entryPoint?.type ?? "",
      entryPointId: data.entryPoint?.id ?? "",
      budgetTotal: data.budget?.total ?? undefined,
      budgetPerDay: data.budget?.perDay ?? undefined,
      budgetLevel: data.budget?.level ?? "",
    }),
    [data.duration, data.dates.start, data.entryPoint?.type, data.entryPoint?.id, data.budget?.total, data.budget?.perDay, data.budget?.level],
  );

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<Step1FormValues>({
    values: formValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const startValue = useWatch({
    control,
    name: "start",
  });

  const durationValue = useWatch({
    control,
    name: "duration",
  });

  const entryPointType = useWatch({
    control,
    name: "entryPointType",
  });

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
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    });
    
    return formatter.format(date);
  }, [calculatedEndDate]);

  const entryPointOptions = useMemo(() => {
    if (!entryPointType) {
      return [];
    }
    // Type guard: check if entryPointType is a valid EntryPointType (not empty string)
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
      // Fallback if entry points data isn't available yet
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
    [],
  );

  const onSubmit = handleSubmit((values) => {
    let entryPoint = undefined;
    if (values.entryPointType && values.entryPointId) {
      const allPoints = getAllEntryPoints();
      entryPoint = allPoints.find((ep) => ep.id === values.entryPointId);
    }

    // Calculate end date from start date and duration
    let endDate = "";
    if (values.start && values.duration && values.duration >= 1) {
      const duration = Math.floor(values.duration);
      const startDate = new Date(values.start);
      const calculatedEndDate = new Date(startDate);
      calculatedEndDate.setDate(startDate.getDate() + duration - 1);
      const [isoDate] = calculatedEndDate.toISOString().split("T");
      if (isoDate) {
        endDate = isoDate;
      }
    }

    setData((prev) => ({
      ...prev,
      duration: values.duration,
      dates: {
        ...prev.dates,
        start: values.start,
        end: endDate,
      },
      entryPoint,
      budget: {
        total: values.budgetTotal,
        perDay: values.budgetPerDay,
        level: values.budgetLevel ? (values.budgetLevel as "budget" | "moderate" | "luxury") : undefined,
      },
    }));
    onNext();
  });

  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className="flex flex-col gap-6 sm:gap-8"
      noValidate
    >
      <div className="flex flex-col gap-2 sm:gap-3">
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Basic info</h2>
        <p className="text-sm text-gray-600 sm:text-base">
          Tell us the essentials so we can start shaping your perfect adventure.
        </p>
      </div>

      <FormField
        id="trip-duration"
        label="Trip duration"
        required
        help="1–14 days"
        error={errors.duration?.message}
      >
        <Input
          id="trip-duration"
          type="number"
          min={MIN_DURATION}
          max={MAX_DURATION}
          inputMode="numeric"
          placeholder="How many days?"
          className="min-h-[44px]"
          {...register("duration", {
            valueAsNumber: true,
            required: "Duration is required",
            min: {
              value: MIN_DURATION,
              message: "Trip must be at least 1 day",
            },
            max: {
              value: MAX_DURATION,
              message: "Trip can be at most 14 days",
            },
            validate: (value) => {
              if (value === undefined || Number.isNaN(value)) {
                return "Duration is required";
              }
              if (!Number.isInteger(value)) {
                return "Duration must be a whole number of days";
              }
              return true;
            },
          })}
        />
      </FormField>

      <div className="flex flex-col gap-6 sm:gap-8">
        <Controller
          control={control}
          name="start"
          rules={{
            required: "Start date is required",
          }}
          render={({ field }) => (
            <DatePicker
              id="trip-start"
              label="Start date"
              required
              value={field.value ?? ""}
              onChange={field.onChange}
              error={errors.start?.message}
              help={
                durationValue && durationValue >= 1
                  ? `Choose the first day. Your trip will be exactly ${Math.floor(durationValue)} days.`
                  : "Choose the first day of your trip."
              }
            />
          )}
        />

        {calculatedEndDate && formattedEndDate && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">End date</p>
                <p className="mt-1 text-sm text-gray-600">
                  {formattedEndDate} ({Math.floor(durationValue || 0)} day{durationValue === 1 ? "" : "s"} from start)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:gap-3">
        <h3 className="text-lg font-medium text-gray-900">Budget (Optional)</h3>
        <p className="text-sm text-gray-600">
          Help us recommend activities that fit your budget. You can specify a total budget, per-day budget, or budget level.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
        <FormField
          id="budget-level"
          label="Budget Level"
          help="General budget category"
          error={errors.budgetLevel?.message}
        >
          <Controller
            control={control}
            name="budgetLevel"
            render={({ field }) => (
              <Select
                id="budget-level"
                placeholder="Select level"
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

        <FormField
          id="budget-total"
          label="Total Budget (¥)"
          help="Total trip budget in Japanese Yen"
          error={errors.budgetTotal?.message}
        >
          <Input
            id="budget-total"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="e.g., 50000"
            className="min-h-[44px]"
            {...register("budgetTotal", {
              valueAsNumber: true,
              min: {
                value: 0,
                message: "Budget cannot be negative",
              },
            })}
          />
        </FormField>

        <FormField
          id="budget-per-day"
          label="Per-Day Budget (¥)"
          help="Daily budget in Japanese Yen"
          error={errors.budgetPerDay?.message}
        >
          <Input
            id="budget-per-day"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="e.g., 5000"
            className="min-h-[44px]"
            {...register("budgetPerDay", {
              valueAsNumber: true,
              min: {
                value: 0,
                message: "Budget cannot be negative",
              },
            })}
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-2 sm:gap-3">
        <h3 className="text-lg font-medium text-gray-900">Entry Point (Optional)</h3>
        <p className="text-sm text-gray-600">
          Where will you start your trip? This helps us optimize your itinerary.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
        <Controller
          control={control}
          name="entryPointType"
          render={({ field }) => (
            <FormField
              id="entry-point-type"
              label="Entry Point Type"
              help="Select the type of entry point"
            >
              <Select
                id="entry-point-type"
                placeholder="Select type"
                options={entryPointTypeOptions}
                value={field.value ?? ""}
                onChange={(e) => {
                  const newValue = e.target.value || undefined;
                  field.onChange(newValue);
                  // Reset entry point ID when type changes
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
              help={entryPointType ? "Select your entry point" : "Select a type first"}
            >
              <Select
                id="entry-point"
                placeholder={entryPointType ? "Select entry point" : "Select type first"}
                options={entryPointOptions}
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? undefined : (val as EntryPointType));
                }}
                disabled={!entryPointType}
              />
            </FormField>
          )}
        />
      </div>
    </form>
  );
}


