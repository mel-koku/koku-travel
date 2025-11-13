"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import GuideBookmarkButton from "./GuideBookmarkButton";
import type { Guide } from "@/types/guide";

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export default function FeaturedGuideHero({ guide }: { guide: Guide }) {
  const router = useRouter();
  const expertSlug = guide.name.toLowerCase().replace(/\s+/g, "-");

  const handleGuideClick = () => {
    router.push(`/guides/${guide.slug}`);
  };

  const handleExpertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/guides/expert/${expertSlug}`);
  };

  return (
    <article className="group block relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl transition hover:shadow-2xl">
      <GuideBookmarkButton
        guideId={guide.id}
        variant="icon"
        className="absolute right-6 top-6 z-10"
      />
      <div className="grid lg:grid-cols-2 gap-0">
        {/* Image Section - Clickable */}
        <div
          onClick={handleGuideClick}
          className="relative h-64 lg:h-96 w-full p-4 lg:p-6 cursor-pointer"
        >
          <div className="relative h-full w-full rounded-2xl overflow-hidden">
            <Image
              src={guide.image || FALLBACK_IMAGE_SRC}
              alt={guide.title}
              fill
              className="object-cover transition group-hover:scale-105"
              sizes="(min-width:1024px) 50vw, 100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col justify-between p-8 lg:p-12">
          <div className="space-y-4">
            {/* Category Badge */}
            <Badge tone="brand" variant="soft">
              {guide.category}
            </Badge>

            {/* Title - Clickable */}
            <h2
              onClick={handleGuideClick}
              className="text-3xl lg:text-4xl font-bold text-gray-900 transition group-hover:text-indigo-600 cursor-pointer"
            >
              {guide.title}
            </h2>

            {/* Summary */}
            <p className="text-lg text-gray-600 leading-relaxed">
              {guide.summary}
            </p>
          </div>

          {/* Author Section - Expert Highlight */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              {/* Avatar - Clickable */}
              <button
                onClick={handleExpertClick}
                className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                aria-label={`View ${guide.name}'s profile`}
              >
                <Avatar name={guide.name} size={48} />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {/* Name - Clickable */}
                  <button
                    onClick={handleExpertClick}
                    className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                  >
                    {guide.name}
                  </button>
                  <Badge tone="success" variant="soft" className="text-xs">
                    Expert Guide
                  </Badge>
                </div>
                {guide.experience && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {guide.experience}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

