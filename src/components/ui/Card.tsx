import * as React from "react"

import { cn } from "@/lib/utils"

export type CardPadding = "none" | "sm" | "md" | "lg"

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  interactive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = "none", interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow",
        interactive &&
          "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:ring-1 hover:ring-primary/10 focus-within:-translate-y-1 focus-within:shadow-xl focus-within:ring-2 focus-within:ring-primary/20",
        paddingClasses[padding],
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-stone", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean
  padding?: Exclude<CardPadding, "none">
}

const CardSection = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, padded = true, padding = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-3",
        padded && paddingClasses[padding],
        className
      )}
      {...props}
    />
  )
)
CardSection.displayName = "CardSection"

const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, padded = true, padding = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-3",
        padded && paddingClasses[padding],
        className
      )}
      {...props}
    />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, padded = true, padding = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3",
        padded && paddingClasses[padding],
        className
      )}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardSection,
}
