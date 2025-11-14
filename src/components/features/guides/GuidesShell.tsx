"use client";

import { useMemo, useState } from "react";

import type { Guide } from "@/types/guide";

import GuideCard from "./GuideCard";
import GuidesFilterBar from "./GuidesFilterBar";
import FeaturedGuideHero from "./FeaturedGuideHero";

export default function GuidesShell({ guides }: { guides: Guide[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  // Find featured guide
  const featuredGuide = useMemo(
    () => guides.find((g) => g.featured) || null,
    [guides],
  );

  const filtered = useMemo(
    () => {
      const filteredGuides = guides.filter(
        (g) =>
          (!query ||
            g.title.toLowerCase().includes(query.toLowerCase()) ||
            g.summary.toLowerCase().includes(query.toLowerCase())) &&
          (!category || g.categories.includes(category)) &&
          (!location || g.location === location),
      );

      // Exclude featured guide from regular grid if it exists
      if (featuredGuide) {
        return filteredGuides.filter((g) => g.id !== featuredGuide.id);
      }

      return filteredGuides;
    },
    [guides, query, category, location, featuredGuide],
  );

  return (
    <section className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-8">
      <GuidesFilterBar
        query={query}
        setQuery={setQuery}
        category={category}
        setCategory={setCategory}
        location={location}
        setLocation={setLocation}
      />

      {/* Featured Guide Hero Section */}
      {featuredGuide && (
        <div className="mt-4 sm:mt-6 md:mt-8">
          <FeaturedGuideHero guide={featuredGuide} />
        </div>
      )}

      {/* Regular Guides Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 mt-8 sm:mt-12 md:mt-16">No guides found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 mt-6 sm:mt-8">
          {filtered.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      )}
    </section>
  );
}


