"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CRAFT_TYPES, getCraftTypeColor, type CraftTypeId } from "@/data/craftTypes";
import { resizePhotoUrl } from "@/lib/google/transformations";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type CraftTaxonomyBProps = {
  counts: Map<string, number>;
  onSelect: (craftType: CraftTypeId) => void;
  images: Map<string, string>;
};

export function CraftTaxonomyB({ counts, onSelect, images }: CraftTaxonomyBProps) {
  const typesWithCounts = CRAFT_TYPES.filter((ct) => (counts.get(ct.id) ?? 0) > 0);

  if (typesWithCounts.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: bEase }}
        className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-4"
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
              transition={{ duration: 0.4, ease: bEase, delay: i * 0.04 }}
              onClick={() => onSelect(ct.id)}
              className="group rounded-2xl bg-white text-left overflow-hidden transition-shadow shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]"
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
                    {/* Color wash gradient */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `linear-gradient(to top, ${color}40 0%, transparent 60%)`,
                      }}
                    />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, var(--surface))` }}
                  >
                    <span
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: color, opacity: 0.4 }}
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
                  <span className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {ct.label}
                  </span>
                  <span className="ml-auto text-xs tabular-nums text-[var(--muted-foreground)]">
                    {counts.get(ct.id) ?? 0}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)] pl-4">
                  {ct.labelJapanese}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)] pl-4 line-clamp-2 leading-relaxed">
                  {ct.description}
                </p>
              </div>
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
              transition={{ duration: 0.4, ease: bEase, delay: i * 0.04 }}
              onClick={() => onSelect(ct.id)}
              className="group snap-start shrink-0 rounded-2xl bg-white text-left overflow-hidden transition-shadow shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] min-w-[200px]"
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
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `linear-gradient(to top, ${color}40 0%, transparent 60%)`,
                      }}
                    />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, var(--surface))` }}
                  >
                    <span
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: color, opacity: 0.4 }}
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
                  <span className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {ct.label}
                  </span>
                  <span className="ml-auto text-xs tabular-nums text-[var(--muted-foreground)]">
                    {counts.get(ct.id) ?? 0}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)] pl-4">
                  {ct.labelJapanese}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)] pl-4 line-clamp-2 leading-relaxed">
                  {ct.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
