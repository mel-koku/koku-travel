"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

type VibeCardProps = {
  name: string;
  description: string;
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
};

export function VibeCard({
  name,
  description,
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
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.08 + index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`group relative flex w-full items-center gap-4 border-l-[3px] py-3 pl-5 pr-4 text-left transition-colors duration-300 sm:gap-5 sm:py-3.5 sm:pl-6 sm:pr-5 ${
        isSelected
          ? "border-l-brand-primary bg-surface/60"
          : "border-l-transparent hover:bg-surface/40"
      } ${isDisabled && !isSelected ? "cursor-not-allowed opacity-35" : "cursor-pointer"}`}
    >
      {/* Index number */}
      <span className="font-mono text-[11px] tabular-nums text-stone/50 transition-colors group-hover:text-stone">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h3
          className={`font-serif text-lg leading-tight tracking-tight transition-colors duration-300 sm:text-xl ${
            isSelected
              ? "text-brand-primary"
              : "text-foreground group-hover:text-brand-primary"
          }`}
        >
          {name}
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-stone sm:text-[13px]">
          {description}
        </p>
      </div>

      {/* Selection indicator */}
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300 ${
          isSelected
            ? "border-brand-primary bg-brand-primary text-white"
            : "border-border/80 group-hover:border-foreground/30"
        }`}
      >
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
