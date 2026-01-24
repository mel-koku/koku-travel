import { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export type FormLabelProps = ComponentPropsWithoutRef<"label"> & {
  /**
   * Displays a red asterisk to indicate the field is required.
   */
  required?: boolean;
};

export const FormLabel = ({ className, children, required, ...rest }: FormLabelProps) => (
  <label
    className={cn("mb-2 block text-sm font-semibold text-gray-900", className)}
    {...rest}
  >
    <span className="inline-flex items-center gap-1">
      {children}
      {required && <span className="text-red-500" aria-hidden="true">*</span>}
    </span>
  </label>
);

FormLabel.displayName = "FormLabel";

