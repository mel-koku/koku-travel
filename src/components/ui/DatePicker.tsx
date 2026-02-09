"use client";

import { ChangeEvent, useCallback } from "react";

import { cn } from "@/lib/cn";

import { FormField } from "./FormField";
import { Input } from "./Input";

export type DatePickerProps = {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  help?: string;
  className?: string;
  inputClassName?: string;
};

/**
 * Thin wrapper around the native date input that keeps styling and accessibility consistent.
 */
export function DatePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  error,
  help,
  className,
  inputClassName,
}: DatePickerProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      help={help}
      error={error}
      className={className}
    >
      <Input
        id={id}
        type="date"
        value={value ?? ""}
        onChange={handleChange}
        min={min}
        max={max}
        disabled={disabled}
        error={error}
        className={cn(
          "h-12",
          "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100",
          inputClassName
        )}
      />
    </FormField>
  );
}


