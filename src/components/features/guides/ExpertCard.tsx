"use client";

import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { ExpertProfile } from "@/types/expert";

export default function ExpertCard({ expert }: { expert: ExpertProfile }) {
  const expertSlug = expert.id;

  return (
    <Link href={`/guides/expert/${expertSlug}`}>
      <article className="group relative overflow-hidden rounded-2xl border border-stone-200/50 bg-white/40 backdrop-blur-md shadow-sm shadow-stone-900/5 transition-all hover:border-stone-300/60 hover:bg-white/60 hover:shadow-lg cursor-pointer h-full flex flex-col">
        {/* Cover Image */}
        {expert.coverImage ? (
          <div className="relative h-48 w-full">
            <Image
              src={expert.coverImage}
              alt={`${expert.name} cover`}
              fill
              className="object-cover transition group-hover:opacity-95"
              sizes="(min-width:1024px) 25vw, (min-width:640px) 40vw, 100vw"
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="relative h-48 w-full bg-gradient-to-br from-indigo-100 to-purple-100" />
        )}

        <div className="flex flex-col flex-1 p-6 -mt-12 relative z-10">
          {/* Avatar */}
          <div className="mb-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white/60 backdrop-blur-md shadow-lg bg-white/60">
              {expert.avatar ? (
                <Image
                  src={expert.avatar}
                  alt={expert.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <Avatar name={expert.name} size={80} />
              )}
            </div>
          </div>

          {/* Expert Info */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1 transition group-hover:text-indigo-600">
              {expert.name}
            </h3>
            
            {expert.location && (
              <p className="text-sm text-gray-600 mb-3">{expert.location}</p>
            )}

            {expert.yearsExperience && (
              <p className="text-xs text-gray-500 mb-3">
                {expert.yearsExperience} years of experience
              </p>
            )}

            {/* Bio Preview */}
            <p className="text-sm text-gray-700 line-clamp-2 mb-4 leading-relaxed">
              {expert.bio}
            </p>

            {/* Expertise Tags */}
            {expert.expertise.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {expert.expertise.slice(0, 3).map((area) => (
                    <Badge key={area} tone="brand" variant="soft" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                  {expert.expertise.length > 3 && (
                    <Badge tone="secondary" variant="soft" className="text-xs">
                      +{expert.expertise.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Languages */}
            {expert.languages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                {expert.languages.map((lang) => (
                  <Badge key={lang} tone="secondary" variant="soft" className="text-xs">
                    {lang}
                  </Badge>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
              <span>{expert.guides.length} guide{expert.guides.length !== 1 ? "s" : ""}</span>
              {expert.itineraries.length > 0 && (
                <span>{expert.itineraries.length} itinerary{expert.itineraries.length !== 1 ? "ies" : ""}</span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

