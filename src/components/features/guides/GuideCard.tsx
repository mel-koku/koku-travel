import Link from "next/link";
import GuideBookmarkButton from "@/components/features/guides/GuideBookmarkButton";
import { Guide } from "@/types/guide";

export default function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link href={`/guides/${guide.id}`} className="group" prefetch>
      <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:shadow-lg">
        <GuideBookmarkButton
          guideId={guide.id}
          variant="icon"
          className="absolute right-3 top-3"
        />
        <img
          src={guide.image}
          alt={guide.title}
          className="h-48 w-full object-cover transition group-hover:opacity-95"
        />
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
  );
}
