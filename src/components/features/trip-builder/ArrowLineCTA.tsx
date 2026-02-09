"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Magnetic } from "@/components/ui/Magnetic";
import { cn } from "@/lib/cn";

type ArrowLineCTAProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export function ArrowLineCTA({
  label,
  onClick,
  disabled = false,
  className,
}: ArrowLineCTAProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Magnetic strength={0.15} disabled={disabled}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "group flex cursor-pointer items-center gap-3 transition-opacity",
          disabled && "!cursor-not-allowed opacity-40",
          className
        )}
      >
        <span className="text-sm font-medium uppercase tracking-wider text-foreground-secondary transition-colors group-hover:text-foreground">
          {label}
        </span>
        {/* Extending arrow line */}
        <div className="relative flex items-center">
          <motion.div
            className="h-px bg-foreground-secondary transition-colors group-hover:bg-foreground"
            initial={false}
            animate={
              prefersReducedMotion
                ? { width: 40 }
                : { width: disabled ? 24 : 40 }
            }
            whileHover={prefersReducedMotion ? {} : { width: 64 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          />
          <svg
            className="h-3 w-3 -ml-px text-foreground-secondary transition-colors group-hover:text-foreground"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M1 6h10M7 2l4 4-4 4" />
          </svg>
        </div>
      </button>
    </Magnetic>
  );
}
