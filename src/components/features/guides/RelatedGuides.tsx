import Link from "next/link";

import GuideBookmarkButton from "@/components/features/guides/GuideBookmarkButton";
import { MOCK_GUIDES } from "@/data/mockGuides";

export function pickRelated(currentId: string, preferCategory?: string, max = 3) {
  const pool = preferCategory
    ? MOCK_GUIDES.filter((g) => g.category === preferCategory && g.id !== currentId)
    : MOCK_GUIDES.filter((g) => g.id !== currentId);

  // If not enough in-category, top up from others
  const extras = MOCK_GUIDES.filter(
    (g) => g.id !== currentId && g.category !== preferCategory,
  );
  const combined = [...pool, ...extras];

  // de-dup + slice
  const seen = new Set<string>();
  const result: typeof MOCK_GUIDES = [];

  for (const g of combined) {
    if (!seen.has(g.id)) {
      seen.add(g.id);
      result.push(g as any);
    }

    if (result.length >= max) break;
  }

  return result;
}

export default function RelatedGuides({
  currentId,
  category,
  title = "Related Guides",
}: {
  currentId: string;
  category?: string;
  title?: string;
}) {
  const related = pickRelated(currentId, category, 3);

  if (!related.length) return null;

  return (
    <section className="max-w-3xl mx-auto mt-16">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {related.map((g) => (
          <Link key={g.id} href={`/guides/${g.id}`} className="group">
            <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:shadow-lg">
              <GuideBookmarkButton
                guideId={g.id}
                variant="icon"
                className="absolute right-3 top-3"
              />
              <img
                src={g.image}
                alt={g.title}
                className="h-40 w-full object-cover transition group-hover:opacity-95"
              />

              <div className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {g.category}
                </p>
                <h3 className="font-semibold text-gray-900 transition group-hover:text-indigo-600">
                  {g.title}
                </h3>
                <p className="line-clamp-2 text-sm text-gray-600">{g.summary}</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

