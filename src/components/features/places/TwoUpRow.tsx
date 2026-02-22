"use client";

import type { Location } from "@/types/location";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { EditorialCard } from "./EditorialCard";

type TwoUpRowProps = {
  locations: Location[];
  onSelect?: (location: Location) => void;
};

export function TwoUpRow({ locations, onSelect }: TwoUpRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[7fr_5fr] gap-4 sm:gap-6">
      {locations[0] && (
        <ScrollReveal distance={30} duration={0.6}>
          <EditorialCard location={locations[0]} onSelect={onSelect} variant="landscape" />
        </ScrollReveal>
      )}
      {locations[1] && (
        <ScrollReveal distance={30} duration={0.6} stagger={0.1}>
          <EditorialCard location={locations[1]} onSelect={onSelect} variant="square" />
        </ScrollReveal>
      )}
    </div>
  );
}
