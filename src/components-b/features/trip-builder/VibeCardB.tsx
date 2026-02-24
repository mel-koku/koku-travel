"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type VibeCardBProps = {
  name: string;
  description: string;
  image: string;
  icon: LucideIcon | ((props: { className?: string }) => React.ReactNode);
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
};

export function VibeCardB({
  name,
  description,
  image,
  icon: Icon,
  index,
  isSelected,
  isDisabled,
  onToggle,
}: VibeCardBProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={isDisabled && !isSelected}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 + index * 0.08, ease: bEase }}
      whileHover={
        !isDisabled || isSelected
          ? {
              y: -3,
              transition: { type: "spring", stiffness: 300, damping: 25 },
            }
          : undefined
      }
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left transition-shadow ${
        isSelected
          ? "ring-2 ring-[var(--primary)] shadow-[var(--shadow-elevated)]"
          : "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]"
      } ${isDisabled && !isSelected ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        {/* Check badge */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--primary)]">
            <Icon className="h-4 w-4" />
          </div>
          <h3
            className={`text-sm font-semibold transition-colors ${
              isSelected
                ? "text-[var(--primary)]"
                : "text-[var(--foreground)] group-hover:text-[var(--primary)]"
            }`}
          >
            {name}
          </h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
    </motion.button>
  );
}
