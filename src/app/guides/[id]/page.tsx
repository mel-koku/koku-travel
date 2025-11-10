import Link from "next/link";
import { notFound } from "next/navigation";

import GuideBookmarkButton from "@/components/features/guides/GuideBookmarkButton";
import RelatedGuides from "@/components/features/guides/RelatedGuides";
import { MOCK_GUIDES } from "@/data/mockGuides";

export default async function GuideDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Next.js App Router params are async
  const guide = MOCK_GUIDES.find((g) => g.id === id);

  if (!guide) return notFound();

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Hero */}
      <section className="relative w-full h-80 overflow-hidden">
        <img
          src={guide.image}
          alt={guide.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 mx-auto flex h-full max-w-screen-xl flex-col justify-end px-8 pb-12">
          <span className="text-sm font-medium uppercase tracking-wide text-indigo-200">
            {guide.category}
          </span>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-3 max-w-2xl text-gray-200">{guide.summary}</p>
          <GuideBookmarkButton guideId={guide.id} className="mt-6 w-fit" />
        </div>
      </section>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 md:px-0 mt-16 text-gray-800 leading-relaxed space-y-6">
        <p>
          Welcome to <strong>{guide.title}</strong>. This is mock content for the article body.
          We’ll migrate to MDX in a later step.
        </p>

        <p>Use the related guides below to keep exploring similar topics.</p>
      </article>

      {/* Back link */}
      <div className="max-w-3xl mx-auto mt-12 px-6 md:px-0">
        <Link href="/guides" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          ← Back to Guides
        </Link>
      </div>

      {/* Related Guides */}
      <RelatedGuides currentId={guide.id} category={guide.category} />
    </main>
  );
}
