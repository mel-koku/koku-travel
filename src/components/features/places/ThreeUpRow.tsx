"use client";

import type { Location } from "@/types/location";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { EditorialCard } from "./EditorialCard";

type ThreeUpRowProps = {
  locations: Location[];
  onSelect?: (location: Location) => void;
};

export function ThreeUpRow({ locations, onSelect }: ThreeUpRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {locations.map((location, i) => (
        <ScrollReveal key={location.id} distance={30} duration={0.6} stagger={i * 0.1}>
          <EditorialCard location={location} onSelect={onSelect} variant="standard" />
        </ScrollReveal>
      ))}
    </div>
  );
}
