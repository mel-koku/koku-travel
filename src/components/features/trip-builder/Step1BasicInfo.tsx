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
  end?: string;
  entryPointType?: EntryPointType | "";
  entryPointId?: string;
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

  const defaultValues = useMemo<Step1FormValues>(
    () => ({
      duration: data.duration ?? undefined,
      start: data.dates.start ?? "",
      end: data.dates.end ?? "",
      entryPointType: data.entryPoint?.type ?? "",
      entryPointId: data.entryPoint?.id ?? "",
    }),
    [data],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isValid },
  } = useForm<Step1FormValues>({
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const startValue = useWatch({
    control,
    name: "start",
  });

  const entryPointType = useWatch({
    control,
    name: "entryPointType",
  });

  const entryPointOptions = useMemo(() => {
    if (!entryPointType) {
      return [];
    }
    // Type guard: check if entryPointType is a valid EntryPointType (not empty string)
    const isValidType = (val: string | undefined): val is EntryPointType => {
      return val === "airport" || val === "city" || val === "hotel";
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

    setData((prev) => ({
      ...prev,
      duration: values.duration,
      dates: {
        ...prev.dates,
        start: values.start,
        end: values.end,
      },
      entryPoint,
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

      <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
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
              max={getValues("end")}
              error={errors.start?.message}
              help="Choose the first day of your trip."
            />
          )}
        />

        <Controller
          control={control}
          name="end"
          rules={{
            required: "End date is required",
            validate: (value) => {
              const start = getValues("start");
              if (start && value && value < start) {
                return "End date must be on or after the start date";
              }
              return true;
            },
          }}
          render={({ field }) => (
            <DatePicker
              id="trip-end"
              label="End date"
              required
              min={startValue || undefined}
              value={field.value ?? ""}
              onChange={field.onChange}
              error={errors.end?.message}
              help="Pick when you plan to wrap up."
            />
          )}
        />
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


