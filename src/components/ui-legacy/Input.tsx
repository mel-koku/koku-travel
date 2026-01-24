import { ComponentPropsWithoutRef, ReactNode, forwardRef } from "react";

import { cn } from "@/lib/cn";

/**
 * Input component props.
 * Extends native HTML input element props with additional features like icons and error states.
 */
export type InputProps = ComponentPropsWithoutRef<"input"> & {
  /**
   * Renders an icon inside the input on the left side.
   * The input padding is automatically adjusted to accommodate the icon.
   */
  leadingIcon?: ReactNode;
  /**
   * Renders an icon inside the input on the right side.
   * The input padding is automatically adjusted to accommodate the icon.
   */
  trailingIcon?: ReactNode;
  /**
   * When provided, the input is marked invalid and the outline color changes to red.
   * An error message will be displayed below the input if an id is provided.
   */
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leadingIcon, trailingIcon, error, className, disabled, id, ...rest }, ref) => {
    const customDescribedBy = rest["aria-describedby"] as string | undefined;
    const errorDescribedBy = error && id ? `${id}-error` : undefined;
    const describedByIds = [customDescribedBy, errorDescribedBy].filter(Boolean) as string[];
    const describedBy = describedByIds.length ? describedByIds.join(" ") : undefined;

    // Remove aria-describedby from rest to avoid overwriting our computed value
    const { "aria-describedby": _, ...inputProps } = rest;

    return (
      <div className="relative w-full">
        {leadingIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type={inputProps.type || "text"}
          className={cn(
            "block w-full rounded-xl border border-gray-300 bg-white text-base text-gray-900 placeholder:text-gray-500 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
            "h-12 px-4",
            leadingIcon ? "pl-11" : null,
            trailingIcon ? "pr-11" : null,
            disabled ? "cursor-not-allowed bg-gray-100 text-gray-500 opacity-80" : null,
            error ? "border-red-500 focus-visible:ring-red-500" : null,
            className,
          )}
          disabled={disabled}
          aria-invalid={error ? true : inputProps["aria-invalid"]}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {trailingIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
            {trailingIcon}
          </span>
        )}
        {error && id && (
          <p id={`${id}-error`} className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

