"use client";

import Image from "next/image";
import Link from "next/link";
import type { SanityAuthorSummary } from "@/types/sanityGuide";

type AuthorCardProps = {
  author: SanityAuthorSummary;
};

export function AuthorCard({ author }: AuthorCardProps) {
  return (
    <Link
      href={`/guides/authors/${author.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-border/50 bg-surface p-5 transition-all hover:border-brand-primary/30 hover:shadow-lg"
    >
      {/* Avatar */}
      {author.photo?.url ? (
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
          <Image
            src={author.photo.url}
            alt={author.name}
            fill
            className="object-cover"
            sizes="56px"
          />
        </div>
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <span className="font-serif text-xl italic">
            {author.name.charAt(0)}
          </span>
        </div>
      )}

      <div className="min-w-0">
        <p className="font-serif text-lg italic text-foreground group-hover:text-brand-primary transition-colors">
          {author.name}
        </p>
        <p className="font-mono text-xs text-stone">
          {author.city && <span>{author.city}</span>}
          {author.city && author.guideCount > 0 && " · "}
          {author.guideCount > 0 && (
            <span>
              {author.guideCount} guide{author.guideCount !== 1 ? "s" : ""}
            </span>
          )}
        </p>
        {author.bio && (
          <p className="mt-1 text-sm text-foreground-secondary line-clamp-2">
            {author.bio}
          </p>
        )}
      </div>
    </Link>
  );
}
