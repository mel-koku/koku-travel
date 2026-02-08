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
    className={cn("mb-2 block text-sm font-semibold text-foreground", className)}
    {...rest}
  >
    <span className="inline-flex items-center gap-1">
      {children}
      {required && <span className="text-destructive" aria-hidden="true">*</span>}
    </span>
  </label>
);

FormLabel.displayName = "FormLabel";

