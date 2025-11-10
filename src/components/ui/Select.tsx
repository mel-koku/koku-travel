import { ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "@/lib/cn";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type SelectProps = Omit<ComponentPropsWithoutRef<"select">, "children"> & {
  /**
   * Placeholder text shown while no option is selected.
   */
  placeholder?: string;
  /**
   * Array of options rendered inside the select.
   */
  options: SelectOption[];
  /**
   * When provided, the select is marked invalid and the outline color changes.
   */
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, error, className, id, disabled, defaultValue, ...rest }, ref) => {
    const describedByIds = [
      rest["aria-describedby"] as string | undefined,
      error && id ? `${id}-error` : undefined,
    ].filter(Boolean) as string[];
    const describedBy = describedByIds.length ? describedByIds.join(" ") : undefined;

    const finalDefaultValue =
      rest.value === undefined ? defaultValue ?? (placeholder ? "" : undefined) : undefined;

    return (
      <div className="relative w-full">
        <select
          ref={ref}
          id={id}
          defaultValue={finalDefaultValue}
          className={cn(
            "block w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
            disabled && "cursor-not-allowed bg-gray-100 text-gray-500 opacity-80",
            error && "border-red-500 focus-visible:ring-red-500",
            className,
          )}
          disabled={disabled}
          aria-invalid={error ? true : rest["aria-invalid"]}
          aria-describedby={describedBy}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    );
  },
);

Select.displayName = "Select";

