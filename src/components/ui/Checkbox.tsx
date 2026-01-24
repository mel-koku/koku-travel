"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const CheckboxRoot = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-5 w-5 shrink-0 rounded-md border border-input shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
CheckboxRoot.displayName = CheckboxPrimitive.Root.displayName

// Labeled Checkbox (legacy API)
interface LabeledCheckboxProps extends Omit<React.ComponentPropsWithoutRef<"input">, "type"> {
  label: React.ReactNode
  description?: React.ReactNode
  containerClassName?: string
}

function Checkbox({ label, description, className, containerClassName, disabled, id, checked, defaultChecked, onChange }: LabeledCheckboxProps) {
  const fallbackId = React.useId()
  const inputId = id ?? fallbackId
  const descriptionId = description ? `${inputId}-description` : undefined

  // Handle native input for form compatibility
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
  const isControlled = checked !== undefined
  const isChecked = isControlled ? checked : internalChecked

  const handleCheckedChange = (newChecked: boolean | "indeterminate") => {
    if (typeof newChecked === "boolean") {
      if (!isControlled) {
        setInternalChecked(newChecked)
      }
      // Create a synthetic change event
      const syntheticEvent = {
        target: { checked: newChecked, id: inputId },
        currentTarget: { checked: newChecked, id: inputId },
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(syntheticEvent)
    }
  }

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group flex min-h-10 cursor-pointer items-start gap-3 rounded-xl border border-transparent px-4 py-3 transition",
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-secondary",
        containerClassName
      )}
    >
      <CheckboxRoot
        id={inputId}
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        disabled={disabled}
        aria-describedby={descriptionId}
        className={className}
      />
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
Checkbox.displayName = "Checkbox"

// Checkbox Group
interface CheckboxGroupProps extends React.ComponentPropsWithoutRef<"fieldset"> {
  legend?: React.ReactNode
  helpText?: React.ReactNode
}

const CheckboxGroup = ({
  legend,
  helpText,
  className,
  children,
  ...rest
}: CheckboxGroupProps) => (
  <fieldset className={cn("space-y-2", className)} {...rest}>
    {legend && (
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
    )}
    {helpText && <p className="mb-2 text-sm text-muted-foreground">{helpText}</p>}
    <div className="flex flex-col gap-2">{children}</div>
  </fieldset>
)
CheckboxGroup.displayName = "CheckboxGroup"

export { Checkbox, CheckboxRoot, CheckboxGroup }
