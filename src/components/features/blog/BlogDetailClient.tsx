"use client";

import Image from "next/image";
import Link from "next/link";
import { PortableTextBody } from "@/components/features/guides/PortableTextBody";
import type { SanityBlogPost, SanityBlogPostSummary } from "@/types/sanityBlog";
import { BlogCard } from "./BlogCard";

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

type BlogDetailClientProps = {
  post: SanityBlogPost;
  relatedPosts: SanityBlogPostSummary[];
};

export function BlogDetailClient({ post, relatedPosts }: BlogDetailClientProps) {
  const heroSrc = post.featuredImage?.url || "";

  const authorPhoto = post.author?.photo?.url || "";

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const metaParts = [
    CATEGORY_LABELS[post.category] || post.category,
    post.city || post.region,
    post.readingTimeMinutes ? `${post.readingTimeMinutes} min read` : null,
  ].filter(Boolean);

  return (
    <article className="min-h-[100dvh] bg-background">
      {/* Hero Image */}
      {heroSrc && (
        <div className="relative h-[50vh] w-full overflow-hidden sm:h-[60vh]">
          <Image
            src={heroSrc}
            alt={post.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />

          {/* Overlay content */}
          <div className="absolute inset-0 flex flex-col justify-end px-6 pb-10 sm:px-8 lg:px-12">
            <div className="mx-auto w-full max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-ultra text-white/70">
                {metaParts.join(" \u00b7 ")}
              </p>
              <h1 className="mt-3 font-serif text-3xl italic leading-[1.1] text-white sm:text-4xl lg:text-5xl">
                {post.title}
              </h1>
            </div>
          </div>
        </div>
      )}

      {/* Preamble */}
      <section className="bg-canvas py-8 sm:py-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 text-center sm:flex-row sm:text-left">
          {/* Author avatar */}
          {authorPhoto && (
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
              <Image
                src={authorPhoto}
                alt={post.author.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {post.author?.name}
            </p>
            {publishedDate && (
              <p className="text-xs text-stone">{publishedDate}</p>
            )}
          </div>
        </div>

        {/* Excerpt */}
        <p className="mx-auto mt-6 max-w-2xl px-6 text-base leading-relaxed text-foreground-secondary sm:text-lg">
          {post.excerpt}
        </p>
      </section>

      {/* Body */}
      <PortableTextBody body={post.body} />

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <section className="mx-auto max-w-2xl px-6 pb-12">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-xl bg-surface px-3 py-1 text-xs font-medium text-foreground-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Back to blog */}
      <section className="mx-auto max-w-2xl px-6 pb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-brand-primary transition hover:opacity-80"
        >
          <span aria-hidden="true">&larr;</span> All posts
        </Link>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-border bg-canvas py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-xs uppercase tracking-ultra text-stone mb-6">
              Keep reading
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
              {relatedPosts.map((rp, i) => (
                <BlogCard key={rp._id} post={rp} index={i} eager />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
