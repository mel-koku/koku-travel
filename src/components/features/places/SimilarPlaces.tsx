"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { durationBase, easeReveal } from "@/lib/motion";
import { LocationCard } from "./LocationCard";
import { useSimilarLocationsQuery } from "@/hooks/useSimilarLocationsQuery";

type SimilarPlacesProps = {
  locationId: string;
};

export function SimilarPlaces({ locationId }: SimilarPlacesProps) {
  const { data: locations, isLoading } = useSimilarLocationsQuery(locationId);

  if (isLoading || !locations || locations.length === 0) return null;

  return (
    <section className="bg-background py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: durationBase, ease: [...easeReveal] as [number, number, number, number] }}
          className={cn(typography({ intent: "editorial-h2" }), "text-center mb-10")}
        >
          You Might Also Like
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
