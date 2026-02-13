"use client";

import type { Location } from "@/types/location";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { EditorialCard } from "./EditorialCard";

type FourUpRowProps = {
  locations: Location[];
  onSelect?: (location: Location) => void;
};

export function FourUpRow({ locations, onSelect }: FourUpRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {locations.map((location, i) => (
        <ScrollReveal key={location.id} distance={30} duration={0.6} stagger={i * 0.1}>
          <EditorialCard
            location={location}
            onSelect={onSelect}
            variant="landscape"
          />
        </ScrollReveal>
      ))}
    </div>
  );
}
