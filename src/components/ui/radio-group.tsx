"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"

import { cn } from "@/lib/utils"

const RadioGroupRoot = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroupRoot.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-5 w-5 rounded-full border border-input bg-background shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary/10",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

// Labeled Radio (legacy API)
interface RadioProps extends Omit<React.ComponentPropsWithoutRef<"input">, "type"> {
  label: React.ReactNode
  description?: React.ReactNode
  containerClassName?: string
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, className, containerClassName, disabled, id, checked, value, name, onChange, ...rest }, ref) => {
    const fallbackId = React.useId()
    const inputId = id ?? fallbackId
    const descriptionId = description ? `${inputId}-description` : undefined

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "group flex min-h-10 cursor-pointer items-start gap-3 rounded-xl border border-transparent px-4 py-3 transition",
          disabled ? "cursor-not-allowed opacity-50" : "hover:bg-secondary",
          containerClassName
        )}
      >
        <span className="flex h-5 w-5 flex-none items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="radio"
            name={name}
            value={value}
            checked={checked}
            onChange={onChange}
            className={cn("peer sr-only", className)}
            disabled={disabled}
            aria-describedby={descriptionId}
            {...rest}
          />
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-input bg-background transition peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:opacity-50"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-primary opacity-0 transition peer-checked:opacity-100" />
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">{label}</span>
          {description && (
            <span id={descriptionId} className="text-sm text-muted-foreground">
              {description}
            </span>
          )}
        </span>
      </label>
    )
  }
)
Radio.displayName = "Radio"

// RadioGroup wrapper (legacy API)
interface RadioGroupProps extends React.ComponentPropsWithoutRef<"fieldset"> {
  legend?: React.ReactNode
  helpText?: React.ReactNode
}

const RadioGroup = ({
  legend,
  helpText,
  className,
  children,
  ...rest
}: RadioGroupProps) => (
  <fieldset className={cn("space-y-2", className)} {...rest}>
    {legend && <legend className="mb-2 text-sm font-semibold">{legend}</legend>}
    {helpText && <p className="mb-2 text-sm text-muted-foreground">{helpText}</p>}
    <div className="flex flex-col gap-2">{children}</div>
  </fieldset>
)
RadioGroup.displayName = "RadioGroup"

export { Radio, RadioGroup, RadioGroupRoot, RadioGroupItem }
