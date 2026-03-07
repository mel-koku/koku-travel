"use client";

import { useState, useMemo } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { SanityBlogPostSummary, BlogCategory } from "@/types/sanityBlog";
import { BlogCard } from "./BlogCard";

const CATEGORY_OPTIONS: { value: BlogCategory; label: string }[] = [
  { value: "itineraries", label: "Itineraries" },
  { value: "food-drink", label: "Food & Drink" },
  { value: "culture", label: "Culture" },
  { value: "seasonal", label: "Seasonal" },
  { value: "budget", label: "Budget" },
  { value: "hidden-gems", label: "Hidden Gems" },
  { value: "practical-tips", label: "Practical Tips" },
  { value: "neighborhoods", label: "Neighborhoods" },
];

type BlogListClientProps = {
  posts: SanityBlogPostSummary[];
};

export function BlogListClient({ posts }: BlogListClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | null>(null);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [posts]);

  const filterCategories = useMemo(
    () =>
      CATEGORY_OPTIONS.filter((o) => (categoryCounts[o.value] || 0) > 0).map((o) => ({
        value: o.value,
        label: o.label,
        count: categoryCounts[o.value] || 0,
      })),
    [categoryCounts]
  );

  const filteredPosts = useMemo(() => {
    if (!selectedCategory) return posts;
    return posts.filter((p) => p.category === selectedCategory);
  }, [posts, selectedCategory]);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <p className="font-serif italic text-lg text-foreground">
          Posts are in the works
        </p>
        <p className="mt-2 text-sm text-stone text-center max-w-sm">
          Still writing — browse guides while we finish.
        </p>
        <a
          href="/guides"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white transition hover:bg-brand-primary/90"
        >
          Browse guides
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-4 sm:pt-20 sm:pb-6 lg:pt-28 text-center">
        <p className="font-mono text-xs uppercase tracking-ultra text-stone">
          {posts.length} {posts.length === 1 ? "article" : "articles"}
        </p>

        <ScrollReveal delay={0.1} distance={20} duration={0.5}>
          <h1 className="mt-4 font-serif italic text-[clamp(2rem,4vw,3rem)] leading-[1.1] text-foreground max-w-3xl mx-auto">
            Stories, tips, and deep dives for your Japan trip.
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.2} distance={20} duration={0.5}>
          <p className="text-base text-foreground-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
            From ramen rankings to cherry blossom forecasts — everything we know, in one place.
          </p>
        </ScrollReveal>
      </section>

      {/* Category Filter */}
      {filterCategories.length > 1 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`inline-flex h-9 items-center rounded-xl px-3.5 text-sm font-medium transition ${
                !selectedCategory
                  ? "bg-brand-primary text-white"
                  : "bg-surface text-foreground-secondary hover:text-foreground"
              }`}
            >
              All
            </button>
            {filterCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() =>
                  setSelectedCategory(selectedCategory === cat.value ? null : cat.value)
                }
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-medium transition ${
                  selectedCategory === cat.value
                    ? "bg-brand-primary text-white"
                    : "bg-surface text-foreground-secondary hover:text-foreground"
                }`}
              >
                {cat.label}
                <span className="font-mono text-xs opacity-60">{cat.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Breathing room */}
      <div className="h-4 sm:h-6" aria-hidden="true" />

      {/* Card Grid */}
      <section
        aria-label="Blog posts"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 lg:pb-20"
      >
        {filteredPosts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
            {filteredPosts.map((post, i) => (
              <BlogCard key={post._id} post={post} index={i} eager={i < 3} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="font-serif italic text-lg text-foreground">
              No posts in this category
            </p>
            <p className="mt-2 text-sm text-stone">
              Try another filter, or browse them all.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
