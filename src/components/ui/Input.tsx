import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leadingIcon, trailingIcon, error, disabled, id, ...props }, ref) => {
    const customDescribedBy = props["aria-describedby"] as string | undefined
    const errorDescribedBy = error && id ? `${id}-error` : undefined
    const describedByIds = [customDescribedBy, errorDescribedBy].filter(Boolean) as string[]
    const describedBy = describedByIds.length ? describedByIds.join(" ") : undefined

    const { "aria-describedby": _, ...inputProps } = props

    return (
      <div className="relative w-full">
        {leadingIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone">
            {leadingIcon}
          </span>
        )}
        <input
          type={type || "text"}
          id={id}
          className={cn(
            "flex h-12 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            leadingIcon && "pl-11",
            trailingIcon && "pr-11",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          disabled={disabled}
          aria-invalid={error ? true : inputProps["aria-invalid"]}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {trailingIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-stone">
            {trailingIcon}
          </span>
        )}
        {error && id && (
          <p id={`${id}-error`} className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
