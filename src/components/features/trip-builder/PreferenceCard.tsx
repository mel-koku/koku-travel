"use client";

import { cn } from "@/lib/cn";

export type PreferenceCardProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Non-collapsible preference card — always visible content.
 * Used in the horizontal scroll row of the Review step.
 */
export function PreferenceCard({
  icon,
  title,
  children,
  className,
}: PreferenceCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-6",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal text-foreground-secondary">
          {icon}
        </div>
        <h4 className="font-serif text-lg italic text-foreground">{title}</h4>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
