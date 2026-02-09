"use client";

import type { Location } from "@/types/location";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { EditorialCard } from "./EditorialCard";

type FeatureRowProps = {
  location: Location;
  onSelect?: (location: Location) => void;
};

export function FeatureRow({ location, onSelect }: FeatureRowProps) {
  return (
    <ScrollReveal distance={30} duration={0.6}>
      <EditorialCard location={location} onSelect={onSelect} variant="feature" />
    </ScrollReveal>
  );
}
