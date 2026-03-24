"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CRAFT_TYPES, getCraftTypeColor, type CraftTypeId } from "@/data/craftTypes";
import { resizePhotoUrl } from "@/lib/google/transformations";

const easeReveal = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type CraftTaxonomyProps = {
  counts: Map<string, number>;
  onSelect: (craftType: CraftTypeId) => void;
  images: Map<string, string>;
};

export function CraftTaxonomy({ counts, onSelect, images }: CraftTaxonomyProps) {
  const typesWithCounts = CRAFT_TYPES.filter((ct) => (counts.get(ct.id) ?? 0) > 0);

  if (typesWithCounts.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeReveal }}
        className="eyebrow-mono mb-4"
      >
        Browse by technique
      </motion.p>

      {/* Desktop: grid */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {typesWithCounts.map((ct, i) => {
          const photoUrl = images.get(ct.id);
          const color = getCraftTypeColor(ct.id);
          return (
            <motion.button
              key={ct.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easeReveal, delay: i * 0.04 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onSelect(ct.id)}
              className="group rounded-lg bg-surface border border-border text-left overflow-hidden transition-colors hover:border-brand-primary/30"
            >
              {/* Image or fallback */}
              <div className="relative w-full overflow-hidden aspect-[16/9]">
                {photoUrl ? (
                  <>
                    <Image
                      src={resizePhotoUrl(photoUrl, 400) ?? photoUrl}
                      alt={ct.label}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                    />
                    {/* Dark gradient overlay */}
                    <div className="pointer-events-none absolute inset-0 scrim-50" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface">
                    <span
                      className="h-8 w-8 rounded-full opacity-30"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-semibold text-foreground group-hover:text-brand-primary transition-colors">
                    {ct.label}
                  </span>
                  <span className="ml-auto font-mono text-xs tabular-nums text-stone">
                    {counts.get(ct.id) ?? 0}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-foreground-secondary pl-4">
                  {ct.labelJapanese}
                </p>
                <p className="mt-1 text-xs text-foreground-secondary pl-4 line-clamp-2 leading-relaxed">
                  {ct.description}
                </p>
              </div>

              {/* Hover accent line */}
              <div className="h-[2px] bg-brand-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </motion.button>
          );
        })}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="flex sm:hidden gap-2.5 overflow-x-auto snap-x snap-mandatory overscroll-contain pb-2 -mx-4 px-4">
        {typesWithCounts.map((ct, i) => {
          const photoUrl = images.get(ct.id);
          const color = getCraftTypeColor(ct.id);
          return (
            <motion.button
              key={ct.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easeReveal, delay: i * 0.04 }}
              onClick={() => onSelect(ct.id)}
              className="group snap-start shrink-0 rounded-lg bg-surface border border-border text-left overflow-hidden transition-colors hover:border-brand-primary/30 min-w-[200px]"
            >
              {/* Image or fallback */}
              <div className="relative w-full overflow-hidden aspect-[16/9]">
                {photoUrl ? (
                  <>
                    <Image
                      src={resizePhotoUrl(photoUrl, 400) ?? photoUrl}
                      alt={ct.label}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      sizes="50vw"
                    />
                    <div className="pointer-events-none absolute inset-0 scrim-50" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface">
                    <span
                      className="h-8 w-8 rounded-full opacity-30"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-semibold text-foreground group-hover:text-brand-primary transition-colors">
                    {ct.label}
                  </span>
                  <span className="ml-auto font-mono text-xs tabular-nums text-stone">
                    {counts.get(ct.id) ?? 0}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-foreground-secondary pl-4">
                  {ct.labelJapanese}
                </p>
                <p className="mt-1 text-xs text-foreground-secondary pl-4 line-clamp-2 leading-relaxed">
                  {ct.description}
                </p>
              </div>

              <div className="h-[2px] bg-brand-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
