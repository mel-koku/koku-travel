import {
  ComponentPropsWithoutRef,
  ReactNode,
  forwardRef,
  useId,
} from "react";

import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  /**
   * Visible label next to the checkbox control.
   */
  label: ReactNode;
  /**
   * Optional helper text rendered under the label.
   */
  description?: ReactNode;
  /**
   * Classes applied to the outer clickable label.
   */
  containerClassName?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, containerClassName, disabled, id, ...rest }, ref) => {
    const fallbackId = useId();
    const inputId = id ?? fallbackId;
    const descriptionId = description ? `${inputId}-description` : undefined;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "group flex min-h-10 cursor-pointer items-start gap-3 rounded-xl border border-transparent px-4 py-3 transition focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2",
          disabled ? "cursor-not-allowed bg-gray-50 opacity-70" : "hover:bg-gray-50",
          containerClassName,
        )}
      >
        <span className="flex h-5 w-5 flex-none items-center justify-center pt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn(
              "peer sr-only",
              className,
            )}
            disabled={disabled}
            aria-describedby={descriptionId}
            {...rest}
          />
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-md border border-gray-300 bg-white text-white transition peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 peer-disabled:border-gray-200 peer-disabled:bg-gray-100 peer-disabled:text-gray-300"
          >
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="M5 11l3 3 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {description && (
            <span id={descriptionId} className="text-sm text-gray-500">
              {description}
            </span>
          )}
        </span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

export type CheckboxGroupProps = ComponentPropsWithoutRef<"fieldset"> & {
  legend?: ReactNode;
  helpText?: ReactNode;
};

export const CheckboxGroup = ({
  legend,
  helpText,
  className,
  children,
  ...rest
}: CheckboxGroupProps) => (
  <fieldset className={cn("space-y-2", className)} {...rest}>
    {legend && (
      <legend className="mb-2 text-sm font-semibold text-gray-900">{legend}</legend>
    )}
    {helpText && <p className="mb-2 text-sm text-gray-500">{helpText}</p>}
    <div className="flex flex-col gap-2">{children}</div>
  </fieldset>
);

CheckboxGroup.displayName = "CheckboxGroup";

