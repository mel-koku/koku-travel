import { getPublishedGuides } from "@/lib/guides/guideService";
import { GuidesPageClient } from "@/components/features/guides/GuidesPageClient";

export const metadata = {
  title: "Travel Guides | Koku Travel",
  description:
    "Discover curated travel guides for Japan. From hidden gems to seasonal highlights, find expert tips and local insights for your perfect trip.",
};

export default async function GuidesPage() {
  const guides = await getPublishedGuides();

  return (
    <div className="min-h-screen bg-surface pb-16">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/10">
              <BookIcon className="h-5 w-5 text-sage" />
            </div>
            <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">
              Travel Guides
            </h1>
          </div>
          <p className="text-stone max-w-2xl">
            Curated guides to help you discover the best of Japan. From hidden
            gems to seasonal highlights, find expert tips and local insights.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <GuidesPageClient guides={guides} />
      </div>
    </div>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}
