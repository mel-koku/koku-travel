import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllSanityAuthors } from "@/lib/guides/guideService";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Local Guide Authors | Koku Travel",
  description:
    "Meet the local experts who share their insider knowledge of Japan through our travel guides.",
  openGraph: {
    title: "Local Guide Authors | Koku Travel",
    description:
      "Meet the local experts who share their insider knowledge of Japan through our travel guides.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function AuthorsPageB() {
  const [authors, content] = await Promise.all([
    getAllSanityAuthors(),
    getPagesContent(),
  ]);

  return (
    <div className="min-h-[100dvh]">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-36 pb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          {content?.authorsEyebrow ?? "Our Authors"}
        </p>
        <h1 className="mt-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
          {content?.authorsHeading ?? "Local Guide Authors"}
        </h1>
        <p className="mt-3 text-base text-[var(--foreground-body)] max-w-xl mx-auto">
          {content?.authorsSubtitle ?? "Meet the local experts behind our Japan travel guides"}
        </p>
      </section>

      {/* Authors grid */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 lg:pb-32">
        {authors.length === 0 ? (
          <p className="text-center text-[var(--muted-foreground)]">
            {content?.authorsEmptyState ?? "No authors yet. Check back soon."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {authors.map((author) => (
              <Link
                key={author._id}
                href={`/b/guides/authors/${author.slug}`}
                className="group flex items-center gap-4 rounded-2xl bg-white p-5 transition-all hover:shadow-[var(--shadow-elevated)]"
                style={{ boxShadow: "var(--shadow-card)" }}
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
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary)]">
                    <span className="text-xl font-bold">
                      {author.name.charAt(0)}
                    </span>
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {author.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {author.city && <span>{author.city}</span>}
                    {author.city && author.guideCount > 0 && " · "}
                    {author.guideCount > 0 && (
                      <span>
                        {author.guideCount} guide{author.guideCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  {author.bio && (
                    <p className="mt-1 text-xs text-[var(--foreground-body)] line-clamp-2">
                      {author.bio}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
