"use client";

import Link from "next/link";

import GuideCard from "@/components/features/guides/GuideCard";
import { MOCK_GUIDES } from "@/data/mockGuides";
import { useAppState } from "@/state/AppState";

export default function GuideBookmarksPage() {
  const { guideBookmarks } = useAppState();

  const bookmarkedGuides = MOCK_GUIDES.filter((guide) => guideBookmarks.includes(guide.id));

  return (
    <main className="min-h-screen bg-gray-50 pt-4 pb-16">
      <section className="mx-auto max-w-screen-xl px-8">
        <header className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Saved guides</h1>
          <p className="text-sm text-gray-500">
            {guideBookmarks.length > 0
              ? "Guides you saved to revisit later."
              : "You haven't saved any guides yet."}
          </p>
        </header>

        {bookmarkedGuides.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarkedGuides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm text-gray-600">No saved guides yet.</p>
            <Link href="/guides" className="mt-4 inline-block text-sm font-medium text-indigo-600">
              Browse guides →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
