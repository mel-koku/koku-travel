"use client";

import Image from "next/image";
import { PortableText, type PortableTextComponents, type PortableTextBlock } from "@portabletext/react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { urlFor } from "@/sanity/image";
import { TipCalloutBlock } from "./blocks/TipCalloutBlock";
import { LocationEmbedBlock } from "./blocks/LocationEmbedBlock";
import { ImageGalleryBlock } from "./blocks/ImageGalleryBlock";

type PortableTextBodyProps = {
  body: unknown[];
};

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <ScrollReveal className="mx-auto max-w-3xl px-6" distance={30}>
        <h2 className="font-serif text-2xl italic text-foreground mt-20 mb-6 sm:text-3xl">
          {children}
        </h2>
      </ScrollReveal>
    ),
    h3: ({ children }) => (
      <div className="mx-auto max-w-2xl px-6">
        <h3 className="font-serif text-xl italic text-foreground mt-12 mb-4">
          {children}
        </h3>
      </div>
    ),
    normal: ({ children }) => (
      <div className="mx-auto max-w-2xl px-6">
        <p className="text-lg leading-[1.8] text-foreground-secondary mb-6">
          {children}
        </p>
      </div>
    ),
    blockquote: ({ children }) => (
      <div className="mx-auto max-w-3xl px-6 my-12">
        <div className="h-px w-12 bg-brand-primary/40 mb-8" />
        <blockquote className="font-serif italic text-xl text-foreground py-4 sm:text-2xl">
          {children}
        </blockquote>
      </div>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <div className="mx-auto max-w-2xl px-6">
        <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-lg leading-[1.8] text-foreground-secondary">
          {children}
        </ul>
      </div>
    ),
    number: ({ children }) => (
      <div className="mx-auto max-w-2xl px-6">
        <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-lg leading-[1.8] text-foreground-secondary">
          {children}
        </ol>
      </div>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="text-foreground-secondary">{children}</li>
    ),
    number: ({ children }) => (
      <li className="text-foreground-secondary">{children}</li>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ children, value }) => {
      const href = value?.href || "";
      const isExternal = href.startsWith("http");
      return (
        <a
          href={href}
          className="link-reveal text-brand-primary"
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
      const src = value?.url || (value?.asset ? urlFor(value).width(1400).quality(85).url() : "");
      if (!src) return null;

      return (
        <ScrollReveal className="mx-auto max-w-5xl px-4 my-12" distance={40}>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
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
            <p className="mt-3 text-center font-mono text-xs text-stone">
              {value.caption}
            </p>
          )}
        </ScrollReveal>
      );
    },
    tipCallout: ({ value }) => <TipCalloutBlock value={value} />,
    locationRef: ({ value }) => <LocationEmbedBlock value={value} />,
    imageGallery: ({ value }) => <ImageGalleryBlock value={value} />,
  },
};

export function PortableTextBody({ body }: PortableTextBodyProps) {
  return (
    <article className="py-20 sm:py-28">
      <PortableText value={body as PortableTextBlock[]} components={components} />
    </article>
  );
}
