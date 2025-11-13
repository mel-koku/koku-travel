import Image from "next/image";
import Link from "next/link";

import GuideBookmarkButton from "@/components/features/guides/GuideBookmarkButton";
import type { Guide } from "@/types/guide";

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function pickRelated(
  currentId: string,
  guides: Guide[],
  preferCategory?: string,
  max = 3,
) {
  const pool = guides.filter((g) => g.slug !== currentId);
  if (!pool.length) return [];

  const prioritized = preferCategory
    ? pool.filter((g) => g.categories.includes(preferCategory))
    : pool;

  const extras = pool.filter((g) => !g.categories.includes(preferCategory ?? ""));
  const combined = preferCategory ? [...prioritized, ...extras] : prioritized;

  const seen = new Set<string>();
  const result: Guide[] = [];

  for (const guide of combined) {
    if (seen.has(guide.slug)) continue;
    seen.add(guide.slug);
    result.push(guide);
    if (result.length >= max) break;
  }

  return result;
}

export default function RelatedGuides({
  currentId,
  category,
  guides,
  title = "Related Guides",
}: {
  currentId: string;
  category?: string;
  guides: Guide[];
  title?: string;
}) {
  const related = pickRelated(currentId, guides, category, 3);

  if (!related.length) return null;

  return (
    <section className="max-w-3xl mx-auto mt-16">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {related.map((guide) => (
          <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group">
            <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:shadow-lg">
              <GuideBookmarkButton
                guideId={guide.id}
                variant="icon"
                className="absolute right-3 top-3"
              />
              <div className="relative h-40 w-full">
                <Image
                  src={guide.image || FALLBACK_IMAGE_SRC}
                  alt={guide.title}
                  fill
                  className="object-cover transition group-hover:opacity-95"
                  sizes="(min-width:1024px) 40vw, (min-width:640px) 50vw, 100vw"
                  priority={false}
                />
              </div>

              <div className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {guide.category}
                </p>
                <h3 className="font-semibold text-gray-900 transition group-hover:text-indigo-600">
                  {guide.title}
                </h3>
                <p className="line-clamp-2 text-sm text-gray-600">{guide.summary}</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

