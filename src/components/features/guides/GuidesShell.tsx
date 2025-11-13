"use client";

import { useMemo, useState } from "react";

import type { Guide } from "@/types/guide";

import GuideCard from "./GuideCard";
import GuidesFilterBar from "./GuidesFilterBar";

export default function GuidesShell({ guides }: { guides: Guide[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const filtered = useMemo(
    () =>
      guides.filter(
        (g) =>
          (!query ||
            g.title.toLowerCase().includes(query.toLowerCase()) ||
            g.summary.toLowerCase().includes(query.toLowerCase())) &&
          (!category || g.categories.includes(category)),
      ),
    [guides, query, category],
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


