"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cEase } from "@c/ui/motionC";

type VibeCardCProps = {
  name: string;
  description: string;
  icon: LucideIcon | ((props: { className?: string }) => React.ReactNode);
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
};

export function VibeCardC({
  name,
  description,
  icon: Icon,
  index,
  isSelected,
  isDisabled,
  onToggle,
}: VibeCardCProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={isDisabled && !isSelected}
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.04, ease: cEase }}
      className={`group relative flex w-full cursor-pointer flex-col items-start bg-[var(--background)] p-5 text-left transition-colors ${
        isSelected
          ? "bg-[var(--foreground)] text-white"
          : "hover:bg-[var(--surface)]"
      } ${isDisabled && !isSelected ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {/* Icon */}
      <div
        className={`flex h-9 w-9 items-center justify-center transition-colors ${
          isSelected
            ? "bg-[var(--primary)] text-white"
            : "bg-[var(--surface)] text-[var(--muted-foreground)] group-hover:text-[var(--primary)]"
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>

      {/* Name */}
      <h3
        className={`mt-3 text-sm font-semibold leading-tight transition-colors ${
          isSelected
            ? "text-white"
            : "text-[var(--foreground)]"
        }`}
      >
        {name}
      </h3>

      {/* Description */}
      <p className={`mt-1 text-xs leading-snug transition-colors ${
        isSelected ? "text-white/60" : "text-[var(--muted-foreground)]"
      }`}>
        {description}
      </p>
    </motion.button>
  );
}
