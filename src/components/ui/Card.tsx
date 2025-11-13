import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";

import { cn } from "@/lib/cn";

export type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = {
  /**
   * Controls the internal padding applied to the card surface.
   */
  padding?: CardPadding;
  /**
   * Enables the elevated hover animation and focus-within treatment.
   */
  interactive?: boolean;
} & ComponentPropsWithoutRef<"div">;

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const Card = forwardRef<ElementRef<"div">, CardProps>((props, ref) => {
  const {
    padding = "md",
    interactive = true,
    className,
    children,
    ...rest
  } = props;

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-border bg-neutral-surface shadow-sm backdrop-blur transition-all duration-300 ease-out",
        interactive &&
          "hover:-translate-y-1 hover:shadow-xl hover:ring-1 hover:ring-brand-primary/10 focus-within:-translate-y-1 focus-within:shadow-xl focus-within:ring-2 focus-within:ring-brand-primary/20",
        paddingClasses[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";

type CardSectionProps = ComponentPropsWithoutRef<"div"> & {
  /**
   * When true, the section applies matching card padding.
   */
  padded?: boolean;
  padding?: Exclude<CardPadding, "none">;
};

const cardSectionBase = "flex flex-col gap-3";

export const CardSection = forwardRef<ElementRef<"div">, CardSectionProps>(
  ({ className, padded = true, padding = "md", ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardSectionBase,
        padded && paddingClasses[padding],
        className,
      )}
      {...rest}
    />
  ),
);

CardSection.displayName = "CardSection";

export const CardHeader = forwardRef<ElementRef<"div">, CardSectionProps>(
  ({ className, ...rest }, ref) => (
    <CardSection
      ref={ref}
      className={cn("border-b border-neutral-border", className)}
      {...rest}
    />
  ),
);

CardHeader.displayName = "CardHeader";

export const CardContent = forwardRef<ElementRef<"div">, CardSectionProps>(
  ({ className, ...rest }, ref) => (
    <CardSection ref={ref} className={cn(className)} {...rest} />
  ),
);

CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<ElementRef<"div">, CardSectionProps>(
  ({ className, ...rest }, ref) => (
    <CardSection
      ref={ref}
      className={cn("border-t border-neutral-border", className)}
      {...rest}
    />
  ),
);

CardFooter.displayName = "CardFooter";

