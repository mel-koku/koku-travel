import { ReactNode } from "react";

import { cn } from "@/lib/cn";

type ContainerSize = "sm" | "md" | "lg" | "xl";

const sizeClassMap: Record<ContainerSize, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
};

export type ContainerProps = {
  /**
   * Controls the maximum width of the container. Defaults to the widest option.
   */
  size?: ContainerSize;
  /**
   * Additional classes applied to the container wrapper.
   */
  className?: string;
  children: ReactNode;
};

/**
 * Provides horizontal centering, responsive padding, and max-width constraints.
 *
 * Desktop spacing is the baseline. Padding tightens at medium and small breakpoints.
 */
export function Container({
  size = "xl",
  className,
  children,
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-8 md:px-6 sm:px-4",
        sizeClassMap[size],
        className,
      )}
    >
      {children}
    </div>
  );
}


