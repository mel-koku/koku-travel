"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type VibeCardProps = {
  name: string;
  description: string;
  icon: LucideIcon | ((props: { className?: string }) => React.ReactNode);
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
};

export function VibeCard({
  name,
  description,
  icon: Icon,
  index,
  isSelected,
  isDisabled,
  onToggle,
}: VibeCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={isDisabled && !isSelected}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={
        !isDisabled || isSelected
          ? {
              y: -2,
              transition: { type: "spring", stiffness: 300, damping: 25 },
            }
          : undefined
      }
      className={`group relative flex cursor-pointer flex-col items-center rounded-xl bg-card px-3 py-4 text-center transition-shadow ${
        isSelected
          ? "ring-2 ring-brand-primary shadow-[var(--shadow-elevated)]"
          : "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]"
      } ${isDisabled && !isSelected ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {/* Check badge */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white"
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </motion.div>
      )}

      {/* Icon */}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
          isSelected
            ? "bg-brand-primary text-white"
            : "bg-surface text-brand-primary group-hover:bg-brand-primary/10"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Name */}
      <h3
        className={`mt-2.5 text-sm font-semibold leading-tight transition-colors ${
          isSelected
            ? "text-brand-primary"
            : "text-foreground group-hover:text-brand-primary"
        }`}
      >
        {name}
      </h3>

      {/* Description */}
      <p className="mt-1 text-xs leading-snug text-stone">
        {description}
      </p>
    </motion.button>
  );
}
