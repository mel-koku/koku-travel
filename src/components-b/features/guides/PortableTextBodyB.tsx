"use client";

import Image from "next/image";
import {
  PortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";
import { urlFor } from "@/sanity/image";
import { TipCalloutBlock } from "@/components/features/guides/blocks/TipCalloutBlock";
import { LocationEmbedBlock } from "@/components/features/guides/blocks/LocationEmbedBlock";
import { ImageGalleryBlock } from "@/components/features/guides/blocks/ImageGalleryBlock";
import { ExperienceHighlightBlock } from "@/components/features/experiences/blocks/ExperienceHighlightBlock";

type PortableTextBodyBProps = {
  body: unknown[];
};

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="text-xl font-bold text-[var(--foreground)] mt-12 mb-4 sm:text-2xl">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-[var(--foreground)] mt-10 mb-3">
        {children}
      </h3>
    ),
    normal: ({ children }) => (
      <p className="text-base sm:text-lg leading-[1.8] text-[var(--foreground-body)] mb-6">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <div className="my-10">
        <blockquote className="text-xl text-[var(--foreground)] py-4 border-l-2 border-[var(--primary)]/40 pl-8 sm:text-2xl">
          {children}
        </blockquote>
      </div>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-base sm:text-lg leading-[1.8] text-[var(--foreground-body)]">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-base sm:text-lg leading-[1.8] text-[var(--foreground-body)]">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="text-[var(--foreground-body)]">{children}</li>
    ),
    number: ({ children }) => (
      <li className="text-[var(--foreground-body)]">{children}</li>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-[var(--foreground)]">
        {children}
      </strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ children, value }) => {
      const href = value?.href || "";
      const isExternal = href.startsWith("http");
      return (
        <a
          href={href}
          className="text-[var(--primary)] hover:underline"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) => {
      const src =
        value?.url ||
        (value?.asset ? urlFor(value).width(1400).quality(85).url() : "");
      if (!src) return null;

      return (
        <div className="my-12">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <Image
              src={src}
              alt={value.alt || ""}
              fill
              className="object-cover"
              sizes="(min-width: 1280px) 80vw, 95vw"
              loading="lazy"
            />
          </div>
          {value.caption && (
            <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
              {value.caption}
            </p>
          )}
        </div>
      );
    },
    tipCallout: ({ value }) => <TipCalloutBlock value={value} />,
    locationRef: ({ value }) => <LocationEmbedBlock value={value} />,
    imageGallery: ({ value }) => <ImageGalleryBlock value={value} />,
    experienceHighlight: ({ value }) => (
      <ExperienceHighlightBlock value={value} />
    ),
  },
};

export function PortableTextBodyB({ body }: PortableTextBodyBProps) {
  return (
    <article className="max-w-2xl">
      <PortableText
        value={body as PortableTextBlock[]}
        components={components}
      />
    </article>
  );
}
