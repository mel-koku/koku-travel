import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, disabled, rows = 4, ...props }, ref) => {
    const describedByIds = [
      props["aria-describedby"] as string | undefined,
      error && id ? `${id}-error` : undefined,
    ].filter(Boolean) as string[]
    const describedBy = describedByIds.length ? describedByIds.join(" ") : undefined

    return (
      <>
        <textarea
          id={id}
          rows={rows}
          className={cn(
            "flex min-h-[144px] w-full rounded-xl border border-input bg-transparent px-4 py-3 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          disabled={disabled}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={describedBy}
          {...props}
        />
        {error && id && (
          <p id={`${id}-error`} className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
