"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import GuideBookmarkButton from "@/components/features/guides/GuideBookmarkButton";
import { Guide } from "@/types/guide";

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export default function GuideCard({ guide }: { guide: Guide }) {
  const router = useRouter();
  const expertSlug = guide.name.toLowerCase().replace(/\s+/g, "-");

  const handleCardClick = () => {
    router.push(`/guides/${guide.slug}`);
  };

  const handleExpertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/guides/expert/${expertSlug}`);
  };

  return (
    <article
      onClick={handleCardClick}
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:shadow-lg cursor-pointer"
    >
      <GuideBookmarkButton
        guideId={guide.id}
        variant="icon"
        className="absolute right-3 top-3 z-10"
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
      <div className="space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {guide.category}
        </p>
        <h3 className="font-semibold text-gray-900 transition group-hover:text-indigo-600">
          {guide.title}
        </h3>
        <p className="line-clamp-2 text-sm text-gray-600">{guide.summary}</p>
        
        {/* Author Section */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExpertClick}
              className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              aria-label={`View ${guide.name}'s profile`}
            >
              <Avatar name={guide.name} size={32} />
            </button>
            <button
              onClick={handleExpertClick}
              className="text-xs font-medium text-gray-700 hover:text-indigo-600 transition-colors text-left flex-1 min-w-0"
            >
              <span className="truncate block">{guide.name}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
