"use client";

import { cn } from "@/lib/cn";

export type PreferenceCardProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
  info?: string;
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
  optional,
  info,
}: PreferenceCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-6",
        className
      )}
    >
      <div className="mb-1 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-foreground-secondary">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-serif text-lg italic text-foreground">{title}</h4>
            {optional && (
              <span className="text-xs text-stone">(optional)</span>
            )}
          </div>
          {info && (
            <p className="text-xs text-stone">{info}</p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}
