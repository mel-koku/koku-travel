import { Metadata } from "next";
import { getAllSanityAuthors } from "@/lib/guides/guideService";
import { PageHeader } from "@/components/ui/PageHeader";
import { AuthorCard } from "@/components/features/guides/AuthorCard";
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

export default async function AuthorsPage() {
  const [authors, content] = await Promise.all([
    getAllSanityAuthors(),
    getPagesContent(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={content?.authorsEyebrow ?? "Our Authors"}
        title={content?.authorsHeading ?? "Local Guide Authors"}
        subtitle={content?.authorsSubtitle ?? "Meet the local experts behind our Japan travel guides"}
        compact
      />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-4xl px-6">
          {authors.length === 0 ? (
            <p className="text-center text-foreground-secondary">
              {content?.authorsEmptyState ?? "No authors yet. Check back soon."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {authors.map((author) => (
                <AuthorCard key={author._id} author={author} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
