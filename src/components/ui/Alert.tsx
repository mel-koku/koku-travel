"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

export type AlertTone = "info" | "success" | "warning" | "error"

const toneStyles: Record<AlertTone, { border: string; iconColor: string }> = {
  info: {
    border: "border-l-primary",
    iconColor: "text-primary",
  },
  success: {
    border: "border-l-success",
    iconColor: "text-success",
  },
  warning: {
    border: "border-l-warning",
    iconColor: "text-warning",
  },
  error: {
    border: "border-l-destructive",
    iconColor: "text-destructive",
  },
}

const icons: Record<AlertTone, React.ReactElement> = {
  info: (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7h.01M12 11v6" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  success: (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 12 4 4 8-8" />
    </svg>
  ),
  warning: (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0Z"
      />
    </svg>
  ),
  error: (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
}

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  tone?: AlertTone
  title?: string
  description?: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
}

function Alert({
  className,
  variant,
  tone,
  title,
  description,
  dismissible = false,
  onDismiss,
  children,
  ...props
}: AlertProps) {
  const [visible, setVisible] = React.useState(true)

  if (!visible) return null

  const handleDismiss = () => {
    onDismiss?.()
    setVisible(false)
  }

  // If using tone-based alert (legacy API)
  if (tone) {
    const toneStyle = toneStyles[tone]
    return (
      <div
        role="alert"
        className={cn(
          "relative flex w-full gap-3 rounded-xl border-l-4 bg-card p-5 shadow-sm ring-1 ring-border",
          toneStyle.border,
          className
        )}
        {...props}
      >
        <span aria-hidden="true" className={cn("mt-0.5", toneStyle.iconColor)}>
          {icons[tone]}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {children}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Dismiss alert"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 20"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M6 14 14 6" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  // Otherwise use default shadcn variant
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
}
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
