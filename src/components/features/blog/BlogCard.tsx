"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { SanityBlogPostSummary } from "@/types/sanityBlog";

const CATEGORY_LABELS: Record<string, string> = {
  itineraries: "Itineraries",
  "food-drink": "Food & Drink",
  culture: "Culture",
  seasonal: "Seasonal",
  budget: "Budget",
  "hidden-gems": "Hidden Gems",
  "practical-tips": "Practical Tips",
  neighborhoods: "Neighborhoods",
};

type BlogCardProps = {
  post: SanityBlogPostSummary;
  index: number;
  eager?: boolean;
};

export function BlogCard({ post, index, eager = false }: BlogCardProps) {
  const imageSrc = post.featuredImage?.url || "";

  const metaParts = [
    CATEGORY_LABELS[post.category] || post.category,
    post.city || post.region,
    post.readingTimeMinutes ? `${post.readingTimeMinutes} min read` : null,
  ].filter(Boolean);

  const authorName = post.author?.name;

  const Wrapper = eager ? "div" : ScrollReveal;
  const wrapperProps = eager ? {} : { delay: index * 0.08, distance: 30 };

  return (
    <Wrapper {...wrapperProps}>
      <Link href={`/blog/${post.slug}`} className="group block">
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={post.title}
              fill
              priority={eager}
              className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-surface">
              <span className="text-stone">No image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        {/* Meta line */}
        <p className="mt-4 font-mono text-xs uppercase tracking-ultra text-stone">
          {metaParts.join(" \u00b7 ")}
        </p>

        {/* Title */}
        <p className="mt-1.5 font-serif text-lg italic text-foreground transition-colors group-hover:text-brand-primary sm:text-xl">
          {post.title}
        </p>

        {/* Excerpt */}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground-secondary">
          {post.excerpt}
        </p>

        {/* Author */}
        {authorName && (
          <p className="mt-3 text-xs text-stone">
            By {authorName}
            {post.publishedAt && (
              <span>
                {" \u00b7 "}
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </p>
        )}
      </Link>
    </Wrapper>
  );
}
