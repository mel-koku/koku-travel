"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

type VibeCardProps = {
  name: string;
  description: string;
  image: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
};

export function VibeCard({
  name,
  description,
  image,
  icon: Icon,
  isSelected,
  isDisabled,
  onToggle,
}: VibeCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      className={cn(
        "group relative w-full cursor-pointer overflow-hidden rounded-2xl transition-all",
        "aspect-[3/4]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected && "border-2 border-brand-primary",
        !isSelected && "border-2 border-transparent",
        isDisabled && "pointer-events-none opacity-40"
      )}
      whileHover={
        prefersReducedMotion
          ? {}
          : { y: -8, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } }
      }
      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={name}
          fill
          className={cn(
            "object-cover transition-all duration-500",
            isSelected ? "brightness-110" : "group-hover:brightness-110"
          )}
          sizes="(max-width: 640px) 50vw, 200px"
        />
      </div>

      {/* Dark gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 transition-colors duration-300",
          isSelected
            ? "bg-gradient-to-t from-charcoal/90 via-brand-primary/20 to-charcoal/10"
            : "bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-charcoal/10"
        )}
      />

      {/* Warm shadow on hover */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: "inset 0 -60px 40px -20px rgba(196,80,79,0.1)" }}
      />

      {/* Content at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <Icon className="h-8 w-8 text-white/80" />
        <h3 className="mt-2 font-serif text-xl italic text-white">{name}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-white/60">{description}</p>
      </div>

      {/* Selected check badge */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </motion.div>
      )}
    </motion.button>
  );
}
