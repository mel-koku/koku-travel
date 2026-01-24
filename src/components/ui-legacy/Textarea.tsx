import { ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea component props.
 * Extends native HTML textarea element props with error state handling.
 */
export type TextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  /**
   * When provided, the textarea is marked invalid and the outline color changes to red.
   * An error message will be displayed below the textarea if an id is provided.
   */
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, disabled, rows = 4, ...rest }, ref) => {
    const describedByIds = [
      rest["aria-describedby"] as string | undefined,
      error && id ? `${id}-error` : undefined,
    ].filter(Boolean) as string[];
    const describedBy = describedByIds.length ? describedByIds.join(" ") : undefined;

    return (
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={cn(
          "block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          "min-h-[9rem] leading-relaxed",
          disabled && "cursor-not-allowed bg-gray-100 text-gray-500 opacity-80",
          error && "border-red-500 focus-visible:ring-red-500",
          className,
        )}
        disabled={disabled}
        aria-invalid={error ? true : rest["aria-invalid"]}
        aria-describedby={describedBy}
        {...rest}
      />
    );
  },
);

Textarea.displayName = "Textarea";

