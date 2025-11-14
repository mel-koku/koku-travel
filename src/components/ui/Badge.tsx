import { ComponentPropsWithoutRef, ElementRef, ReactNode, forwardRef } from "react";

import { cn } from "@/lib/cn";

export type BadgeVariant = "solid" | "soft" | "outline";
export type BadgeTone = "brand" | "secondary" | "success" | "warning" | "error" | "neutral";

type BadgeProps = {
  /**
   * Visual weight of the badge.
   */
  variant?: BadgeVariant;
  /**
   * Color tone applied to the badge.
   */
  tone?: BadgeTone;
} & ComponentPropsWithoutRef<"span">;

const toneStyles: Record<
  BadgeTone,
  {
    solid: string;
    soft: string;
    outline: string;
  }
> = {
  brand: {
    solid: "bg-brand-primary text-white",
    soft: "bg-brand-primary/10 text-brand-primary ring-1 ring-inset ring-brand-primary/20",
    outline: "text-brand-primary ring-1 ring-inset ring-brand-primary/30",
  },
  secondary: {
    solid: "bg-brand-secondary text-white",
    soft: "bg-brand-secondary/10 text-brand-secondary ring-1 ring-inset ring-brand-secondary/20",
    outline: "text-brand-secondary ring-1 ring-inset ring-brand-secondary/30",
  },
  success: {
    solid: "bg-semantic-success text-white",
    soft: "bg-semantic-success/10 text-semantic-success ring-1 ring-inset ring-semantic-success/20",
    outline: "text-semantic-success ring-1 ring-inset ring-semantic-success/30",
  },
  warning: {
    solid: "bg-semantic-warning text-white",
    soft: "bg-semantic-warning/10 text-semantic-warning ring-1 ring-inset ring-semantic-warning/20",
    outline: "text-semantic-warning ring-1 ring-inset ring-semantic-warning/30",
  },
  error: {
    solid: "bg-semantic-error text-white",
    soft: "bg-semantic-error/10 text-semantic-error ring-1 ring-inset ring-semantic-error/20",
    outline: "text-semantic-error ring-1 ring-inset ring-semantic-error/30",
  },
  neutral: {
    solid: "bg-neutral-border text-neutral-textPrimary",
    soft: "bg-neutral-surface text-neutral-textPrimary ring-1 ring-inset ring-neutral-border",
    outline: "text-neutral-textSecondary ring-1 ring-inset ring-neutral-border",
  },
};

export const Badge = forwardRef<ElementRef<"span">, BadgeProps>((props, ref) => {
  const { variant = "soft", tone = "brand", className, ...rest } = props;

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        toneStyles[tone][variant],
        variant === "outline" && "bg-neutral-surface",
        className,
      )}
      {...rest}
    />
  );
});

Badge.displayName = "Badge";

type TagProps = {
  tone?: BadgeTone;
  icon?: ReactNode;
} & ComponentPropsWithoutRef<"span">;

const tagToneClasses: Record<BadgeTone, string> = {
  brand:
    "bg-brand-primary/10 text-brand-primary border-transparent ring-1 ring-inset ring-brand-primary/20",
  secondary:
    "bg-brand-secondary/10 text-brand-secondary border-transparent ring-1 ring-inset ring-brand-secondary/20",
  success:
    "bg-semantic-success/10 text-semantic-success border-transparent ring-1 ring-inset ring-semantic-success/20",
  warning:
    "bg-semantic-warning/10 text-semantic-warning border-transparent ring-1 ring-inset ring-semantic-warning/20",
  error:
    "bg-semantic-error/10 text-semantic-error border-transparent ring-1 ring-inset ring-semantic-error/20",
  neutral: "bg-neutral-surface text-neutral-textSecondary border-neutral-border",
};

export const Tag = forwardRef<ElementRef<"span">, TagProps>(
  ({ tone = "neutral", icon, className, children, ...rest }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        tagToneClasses[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  ),
);

Tag.displayName = "Tag";

