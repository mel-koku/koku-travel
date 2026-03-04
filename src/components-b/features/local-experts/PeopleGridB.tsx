"use client";

import { useEffect, useRef, useState } from "react";
import type { Person } from "@/types/person";
import { PersonCardB } from "./PersonCardB";

const PAGE_SIZE = 40;

type Props = {
  people: Person[];
  onPersonClick: (person: Person) => void;
};

export function PeopleGridB({ people, onPersonClick }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination when filtered list changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [people.length]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, people.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [people.length]);

  const visible = people.slice(0, visibleCount);

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold text-[var(--foreground)]">
          No experts found
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((person, i) => (
          <PersonCardB
            key={person.id}
            person={person}
            index={i}
            onClick={() => onPersonClick(person)}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {visibleCount < people.length && (
        <div ref={sentinelRef} className="h-10" aria-hidden />
      )}
    </div>
  );
}
