"use client";

import Image from "next/image";
import {
  PortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";
import { urlFor } from "@/sanity/image";
import { TipCalloutBlockC } from "./blocks/TipCalloutBlockC";
import { LocationEmbedBlockC } from "./blocks/LocationEmbedBlockC";
import { ImageGalleryBlockC } from "./blocks/ImageGalleryBlockC";
import { ExperienceHighlightBlockC } from "./blocks/ExperienceHighlightBlockC";

type PortableTextBodyCProps = {
  body: unknown[];
};

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2
        className="mt-14 mb-5 text-xl font-bold text-[var(--foreground)] sm:text-2xl"
        style={{ letterSpacing: "-0.03em" }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className="mt-10 mb-3 text-lg font-bold text-[var(--foreground)]"
        style={{ letterSpacing: "-0.01em" }}
      >
        {children}
      </h3>
    ),
    normal: ({ children }) => (
      <p className="mb-6 text-base leading-[1.8] text-[var(--muted-foreground)] sm:text-lg">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <div className="my-12">
        <blockquote
          className="border-l-2 border-[var(--primary)] py-4 pl-8 text-xl text-[var(--foreground)] sm:text-2xl"
          style={{ letterSpacing: "-0.01em" }}
        >
          {children}
        </blockquote>
      </div>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-6 ml-6 list-outside list-disc space-y-2 text-base leading-[1.8] text-[var(--muted-foreground)] sm:text-lg">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mb-6 ml-6 list-outside list-decimal space-y-2 text-base leading-[1.8] text-[var(--muted-foreground)] sm:text-lg">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="text-[var(--muted-foreground)]">{children}</li>
    ),
    number: ({ children }) => (
      <li className="text-[var(--muted-foreground)]">{children}</li>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-[var(--foreground)]">
        {children}
      </strong>
    ),
    em: ({ children }) => <em>{children}</em>,
    link: ({ children, value }) => {
      const href = value?.href || "";
      const isExternal = href.startsWith("http");
      return (
        <a
          href={href}
          className="text-[var(--primary)] underline underline-offset-2 hover:opacity-80"
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
          <div className="relative aspect-[16/9] w-full overflow-hidden border border-[var(--border)]">
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
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              {value.caption}
            </p>
          )}
        </div>
      );
    },
    tipCallout: ({ value }) => <TipCalloutBlockC value={value} />,
    locationRef: ({ value }) => <LocationEmbedBlockC value={value} />,
    imageGallery: ({ value }) => <ImageGalleryBlockC value={value} />,
    experienceHighlight: ({ value }) => (
      <ExperienceHighlightBlockC value={value} />
    ),
  },
};

export function PortableTextBodyC({ body }: PortableTextBodyCProps) {
  return (
    <article className="max-w-2xl">
      <PortableText
        value={body as PortableTextBlock[]}
        components={components}
      />
    </article>
  );
}
