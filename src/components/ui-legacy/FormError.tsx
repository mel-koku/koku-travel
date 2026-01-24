import { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export type FormErrorProps = ComponentPropsWithoutRef<"p">;

export const FormError = ({ className, children, ...rest }: FormErrorProps) => (
  <p className={cn("mt-2 text-sm text-red-600", className)} role="alert" {...rest}>
    {children}
  </p>
);

FormError.displayName = "FormError";

