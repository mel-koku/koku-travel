import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import Link from "next/link"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-secondary hover:text-secondary-foreground hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        "brand-ghost": "border border-border text-stone transition hover:bg-surface",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[44px] h-10 px-4 py-2",
        sm: "min-h-[44px] h-9 rounded-xl px-3 text-sm",
        md: "min-h-[44px] h-10 px-4 py-2",
        lg: "min-h-[44px] h-12 rounded-xl px-6",
        icon: "h-11 w-11",
        chip: "min-h-0 h-auto rounded-full px-3 py-1.5 text-xs font-medium",
        chipTiny: "min-h-0 h-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin text-current"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  href?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth,
      href,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      buttonVariants({ variant, size }),
      fullWidth && "w-full",
      isLoading && "pointer-events-none",
      className
    )

    const content = (
      <>
        {(isLoading || leftIcon) && (
          <span className="inline-flex h-5 w-5 items-center justify-center">
            {isLoading ? <Spinner /> : leftIcon}
          </span>
        )}
        <span className="truncate">{children}</span>
        {rightIcon && !isLoading && (
          <span className="inline-flex h-5 w-5 items-center justify-center">
            {rightIcon}
          </span>
        )}
      </>
    )

    // Handle asChild with href (Link)
    if (asChild && href) {
      return (
        <Link
          href={href}
          className={classes}
          aria-busy={isLoading}
          aria-disabled={disabled || isLoading}
        >
          {content}
        </Link>
      )
    }

    // Handle regular asChild (Slot)
    if (asChild) {
      return (
        <Slot
          className={classes}
          ref={ref as React.Ref<HTMLElement>}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        type={props.type || "button"}
        className={classes}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
