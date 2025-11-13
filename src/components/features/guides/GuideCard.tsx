import Image from "next/image";
import Link from "next/link";
import GuideBookmarkButton from "@/components/features/guides/GuideBookmarkButton";
import { Guide } from "@/types/guide";

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export default function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link href={`/guides/${guide.slug}`} className="group" prefetch>
      <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:shadow-lg">
        <GuideBookmarkButton
          guideId={guide.id}
          variant="icon"
          className="absolute right-3 top-3"
        />
        <div className="relative h-48 w-full">
          <Image
            src={guide.image || FALLBACK_IMAGE_SRC}
            alt={guide.title}
            fill
            className="object-cover transition group-hover:opacity-95"
            sizes="(min-width:1024px) 25vw, (min-width:640px) 40vw, 100vw"
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
  );
}
