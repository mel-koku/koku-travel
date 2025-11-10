import { ComponentPropsWithoutRef, ElementRef, ReactNode, forwardRef } from "react";

import { cn } from "@/lib/cn";

export type BadgeVariant = "solid" | "soft" | "outline";
export type BadgeTone = "indigo" | "rose" | "emerald" | "amber" | "slate";

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
  indigo: {
    solid: "bg-indigo-600 text-white",
    soft: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100",
    outline: "text-indigo-600 ring-1 ring-inset ring-indigo-200",
  },
  rose: {
    solid: "bg-rose-600 text-white",
    soft: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100",
    outline: "text-rose-600 ring-1 ring-inset ring-rose-200",
  },
  emerald: {
    solid: "bg-emerald-600 text-white",
    soft: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
    outline: "text-emerald-600 ring-1 ring-inset ring-emerald-200",
  },
  amber: {
    solid: "bg-amber-500 text-white",
    soft: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
    outline: "text-amber-600 ring-1 ring-inset ring-amber-200",
  },
  slate: {
    solid: "bg-gray-800 text-white",
    soft: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
    outline: "text-gray-700 ring-1 ring-inset ring-gray-300",
  },
};

export const Badge = forwardRef<ElementRef<"span">, BadgeProps>((props, ref) => {
  const { variant = "soft", tone = "indigo", className, ...rest } = props;

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        toneStyles[tone][variant],
        variant === "outline" && "bg-white",
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
  indigo: "bg-indigo-50 text-indigo-700 border-transparent ring-1 ring-inset ring-indigo-100",
  rose: "bg-rose-50 text-rose-700 border-transparent ring-1 ring-inset ring-rose-100",
  emerald: "bg-emerald-50 text-emerald-700 border-transparent ring-1 ring-inset ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-transparent ring-1 ring-inset ring-amber-100",
  slate: "bg-gray-50 text-gray-700 border-gray-200",
};

export const Tag = forwardRef<ElementRef<"span">, TagProps>(
  ({ tone = "slate", icon, className, children, ...rest }, ref) => (
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

