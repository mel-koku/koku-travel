import { ReactNode, cloneElement, isValidElement } from "react";

import { cn } from "@/lib/cn";

import { FormError } from "./FormError";
import { FormLabel } from "./FormLabel";

export type FormFieldProps = {
  /**
   * ID used to connect the label, help text, and error message to the field control.
   */
  id: string;
  /**
   * Visible label rendered above the field.
   */
  label: ReactNode;
  /**
   * Marks the field as required in the label.
   */
  required?: boolean;
  /**
   * Optional helper text displayed below the control when no error is present.
   */
  help?: ReactNode;
  /**
   * Error message shown below the control and read by screen readers.
   */
  error?: ReactNode;
  /**
   * Hide the visual label while keeping it accessible.
   */
  labelHidden?: boolean;
  /**
   * Custom classes for the field wrapper.
   */
  className?: string;
  children: ReactNode;
};

export const FormField = ({
  id,
  label,
  required,
  help,
  error,
  labelHidden,
  className,
  children,
}: FormFieldProps) => {
  const controlId =
    isValidElement(children) && children.props.id ? (children.props.id as string) : id;
  const helpId = help ? `${controlId}-help` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const ariaDescribedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  let control = children;
  if (isValidElement(control)) {
    const existingId = control.props.id as string | undefined;
    const existingDescribedBy = control.props["aria-describedby"] as string | undefined;
    control = cloneElement(control, {
      id: existingId ?? controlId,
      "aria-describedby": [existingDescribedBy, ariaDescribedBy].filter(Boolean).join(" ") || undefined,
      "aria-invalid": error ? true : control.props["aria-invalid"],
    });
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <FormLabel
        htmlFor={controlId}
        required={required}
        className={labelHidden ? "sr-only mb-0" : undefined}
      >
        {label}
      </FormLabel>
      {control}
      {error ? (
        <FormError id={errorId}>{error}</FormError>
      ) : (
        help && (
          <p id={helpId} className="text-sm text-gray-500">
            {help}
          </p>
        )
      )}
    </div>
  );
};

FormField.displayName = "FormField";

