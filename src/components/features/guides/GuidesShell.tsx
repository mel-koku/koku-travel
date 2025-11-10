"use client";

import { useState } from "react";

import { MOCK_GUIDES } from "@/data/mockGuides";

import GuideCard from "./GuideCard";
import GuidesFilterBar from "./GuidesFilterBar";

export default function GuidesShell() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const filtered = MOCK_GUIDES.filter(
    (g) =>
      (!query ||
        g.title.toLowerCase().includes(query.toLowerCase()) ||
        g.summary.toLowerCase().includes(query.toLowerCase())) &&
      (!category || g.category === category),
  );

  return (
    <section className="max-w-screen-xl mx-auto px-8">
      <GuidesFilterBar
        query={query}
        setQuery={setQuery}
        category={category}
        setCategory={setCategory}
      />

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 mt-16">No guides found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filtered.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      )}
    </section>
  );
}


