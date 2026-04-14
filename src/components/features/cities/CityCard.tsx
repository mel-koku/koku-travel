"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { motion } from "framer-motion";
import { resizePhotoUrl } from "@/lib/google/transformations";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type CityCardProps = {
  slug: string;
  name: string;
  nameJapanese: string;
  tagline: string;
  regionName: string;
  locationCount: number;
  topCategories: { category: string; count: number }[];
  heroImage?: string;
  index?: number;
};

export const CityCard = memo(function CityCard({
  slug,
  name,
  nameJapanese,
  tagline,
  regionName,
  locationCount,
  topCategories,
  heroImage,
  index = 0,
}: CityCardProps) {
  const imageSrc = resizePhotoUrl(heroImage, 800) ?? FALLBACK_IMAGE;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      className="group"
    >
      <Link
        href={`/cities/${slug}`}
        className="block w-full overflow-hidden rounded-lg bg-surface transition-all duration-300 border border-border hover:-translate-y-1"
      >
        {/* Image — 16:9 landscape */}
        <div className="relative w-full overflow-hidden aspect-[16/9]">
          <Image
            src={imageSrc}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          />
          <div className="absolute top-3 left-3 z-10">
            <span className="rounded-full bg-charcoal/70 px-2.5 py-1 text-[11px] font-medium text-foreground-secondary backdrop-blur-sm">
              {regionName}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-base text-foreground group-hover:text-brand-primary transition-colors">
              {name}
            </h3>
            <span className="text-xs text-stone">
              {nameJapanese}
            </span>
          </div>

          <p className="text-sm text-foreground-secondary line-clamp-1">
            {tagline}
          </p>

          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <span className="text-[11px] font-medium text-foreground bg-brand-primary/10 px-2 py-0.5 rounded-lg">
              {locationCount} places
            </span>
            {topCategories.slice(0, 3).map((cat) => (
              <span
                key={cat.category}
                className="text-[11px] font-medium capitalize bg-surface text-stone px-2 py-0.5 rounded-lg border border-border"
              >
                {cat.category}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.article>
  );
});
