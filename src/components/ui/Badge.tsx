import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

export type BadgeVariant = "solid" | "soft" | "outline" | "default" | "secondary" | "destructive"
export type BadgeTone = "brand" | "secondary" | "success" | "warning" | "error" | "neutral"

const toneStyles: Record<
  BadgeTone,
  {
    solid: string
    soft: string
    outline: string
  }
> = {
  brand: {
    solid: "bg-primary text-primary-foreground",
    soft: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
    outline: "text-primary ring-1 ring-inset ring-primary/30 bg-background",
  },
  secondary: {
    solid: "bg-terracotta text-white",
    soft: "bg-terracotta/10 text-terracotta ring-1 ring-inset ring-terracotta/20",
    outline: "text-terracotta ring-1 ring-inset ring-terracotta/30 bg-background",
  },
  success: {
    solid: "bg-success text-white",
    soft: "bg-success/10 text-success ring-1 ring-inset ring-success/20",
    outline: "text-success ring-1 ring-inset ring-success/30 bg-background",
  },
  warning: {
    solid: "bg-warning text-white",
    soft: "bg-warning/10 text-warning ring-1 ring-inset ring-warning/20",
    outline: "text-warning ring-1 ring-inset ring-warning/30 bg-background",
  },
  error: {
    solid: "bg-destructive text-destructive-foreground",
    soft: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
    outline: "text-destructive ring-1 ring-inset ring-destructive/30 bg-background",
  },
  neutral: {
    solid: "bg-muted text-muted-foreground",
    soft: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
    outline: "text-muted-foreground ring-1 ring-inset ring-border bg-background",
  },
}

const badgeVariants = cva(
  "inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border border-input",
        // These are handled specially via tone
        solid: "",
        soft: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  tone?: BadgeTone
}

function Badge({ className, variant = "soft", tone = "brand", ...props }: BadgeProps) {
  // If using tone-based variants (solid, soft, outline)
  if (tone && (variant === "solid" || variant === "soft" || variant === "outline")) {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
          toneStyles[tone][variant],
          className
        )}
        {...props}
      />
    )
  }

  // Otherwise use default shadcn variants
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Tag component (from legacy Badge.tsx)
interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  icon?: React.ReactNode
}

const tagToneClasses: Record<BadgeTone, string> = {
  brand:
    "bg-primary/10 text-primary border-transparent ring-1 ring-inset ring-primary/20",
  secondary:
    "bg-terracotta/10 text-terracotta border-transparent ring-1 ring-inset ring-terracotta/20",
  success:
    "bg-success/10 text-success border-transparent ring-1 ring-inset ring-success/20",
  warning:
    "bg-warning/10 text-warning border-transparent ring-1 ring-inset ring-warning/20",
  error:
    "bg-destructive/10 text-destructive border-transparent ring-1 ring-inset ring-destructive/20",
  neutral: "bg-muted text-muted-foreground border-border",
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ tone = "neutral", icon, className, children, ...rest }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium transition-colors",
        tagToneClasses[tone],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  )
)
Tag.displayName = "Tag"

export { Badge, Tag, badgeVariants }
