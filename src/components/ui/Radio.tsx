import {
  ComponentPropsWithoutRef,
  ReactNode,
  forwardRef,
  useId,
} from "react";

import { cn } from "@/lib/cn";

export type RadioProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  /**
   * Visible label next to the radio control.
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

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, className, containerClassName, disabled, id, ...rest }, ref) => {
    const fallbackId = useId();
    const inputId = id ?? fallbackId;
    const descriptionId = description ? `${inputId}-description` : undefined;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "group flex min-h-10 cursor-pointer items-start gap-3 rounded-xl border border-transparent px-4 py-3 transition focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2",
          disabled ? "cursor-not-allowed bg-neutral-surface opacity-70" : "hover:bg-neutral-surface",
          containerClassName,
        )}
      >
        <span className="flex h-5 w-5 flex-none items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="radio"
            className={cn("peer sr-only", className)}
            disabled={disabled}
            aria-describedby={descriptionId}
            {...rest}
          />
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-border bg-white transition peer-checked:border-brand-primary peer-checked:bg-brand-primary/10 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary peer-focus-visible:ring-offset-2 peer-disabled:border-neutral-border peer-disabled:bg-neutral-surface"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-brand-primary opacity-0 transition peer-checked:opacity-100 peer-disabled:bg-earthy-stone" />
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-earthy-charcoal">{label}</span>
          {description && (
            <span id={descriptionId} className="text-sm text-earthy-stone">
              {description}
            </span>
          )}
        </span>
      </label>
    );
  },
);

Radio.displayName = "Radio";

export type RadioGroupProps = ComponentPropsWithoutRef<"fieldset"> & {
  legend?: ReactNode;
  helpText?: ReactNode;
};

export const RadioGroup = ({
  legend,
  helpText,
  className,
  children,
  ...rest
}: RadioGroupProps) => (
  <fieldset className={cn("space-y-2", className)} {...rest}>
    {legend && <legend className="mb-2 text-sm font-semibold text-earthy-charcoal">{legend}</legend>}
    {helpText && <p className="mb-2 text-sm text-earthy-stone">{helpText}</p>}
    <div className="flex flex-col gap-2">{children}</div>
  </fieldset>
);

RadioGroup.displayName = "RadioGroup";

