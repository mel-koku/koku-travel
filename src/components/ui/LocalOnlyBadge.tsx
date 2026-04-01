// src/components/ui/LocalOnlyBadge.tsx
"use client";

import { Smartphone } from "lucide-react";

type LocalOnlyBadgeProps = {
  className?: string;
};

export function LocalOnlyBadge({ className }: LocalOnlyBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-foreground-secondary ${className ?? ""}`}>
      <Smartphone className="h-3 w-3" />
      On this device only
    </span>
  );
}
