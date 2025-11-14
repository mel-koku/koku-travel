import { ComponentPropsWithoutRef, ReactNode, forwardRef } from "react";

import { cn } from "@/lib/cn";

export type InputProps = ComponentPropsWithoutRef<"input"> & {
  /**
   * Renders an icon inside the input on the left side.
   */
  leadingIcon?: ReactNode;
  /**
   * Renders an icon inside the input on the right side.
   */
  trailingIcon?: ReactNode;
  /**
   * When provided, the input is marked invalid and the outline color changes.
   */
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leadingIcon, trailingIcon, error, className, disabled, id, ...rest }, ref) => {
    const describedByIds = [
      rest["aria-describedby"] as string | undefined,
      error && id ? `${id}-error` : undefined,
    ].filter(Boolean) as string[];
    const describedBy = describedByIds.length ? describedByIds.join(" ") : undefined;

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
          aria-invalid={error ? true : rest["aria-invalid"]}
          aria-describedby={describedBy}
          {...rest}
        />
        {trailingIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
            {trailingIcon}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

