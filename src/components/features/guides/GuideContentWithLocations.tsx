"use client";

import { Fragment, useMemo } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { LocationBreakoutCard } from "./LocationBreakoutCard";
import type { Location } from "@/types/location";

type GuideContentWithLocationsProps = {
  body: string;
  locations: Location[];
};

// ── Markdown components (shared with GuideContent) ──

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <ScrollReveal className="mx-auto max-w-3xl px-6" distance={30}>
      <h1
        className={cn(
          typography({ intent: "editorial-h2" }),
          "mt-20 mb-6 first:mt-0"
        )}
      >
        {children}
      </h1>
    </ScrollReveal>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <ScrollReveal className="mx-auto max-w-3xl px-6" distance={30}>
      <h2 className={cn(typography({ intent: "editorial-h2" }), "mt-20 mb-6")}>
        {children}
      </h2>
    </ScrollReveal>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <div className="mx-auto max-w-2xl px-6">
      <h3 className={cn(typography({ intent: "editorial-h3" }), "mt-12 mb-4")}>
        {children}
      </h3>
    </div>
  ),
  p: ({
    children,
    node,
  }: {
    children?: React.ReactNode;
    node?: { children?: Array<{ type?: string; tagName?: string }> };
  }) => {
    const hasOnlyImage =
      node?.children?.length === 1 &&
      node.children[0]?.type === "element" &&
      node.children[0]?.tagName === "img";
    if (hasOnlyImage) {
      return <>{children}</>;
    }
    return (
      <div className="mx-auto max-w-2xl px-6">
        <p className="text-base sm:text-lg leading-[1.8] text-foreground-body mb-6">
          {children}
        </p>
      </div>
    );
  },
  img: ({ src, alt }: { src?: string | Blob; alt?: string }) => {
    const imgSrc = typeof src === "string" ? src : "";
    return (
      <ScrollReveal className="mx-auto max-w-5xl px-4 my-12" distance={40}>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
          <Image
            src={imgSrc}
            alt={alt || ""}
            fill
            className="object-cover"
            sizes="(min-width: 1280px) 80vw, 95vw"
            loading="lazy"
          />
        </div>
        {alt && (
          <p className="mt-3 text-center font-mono text-xs text-stone">
            {alt}
          </p>
        )}
      </ScrollReveal>
    );
  },
  ul: ({ children }: { children?: React.ReactNode }) => (
    <div className="mx-auto max-w-2xl px-6">
      <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-base sm:text-lg leading-[1.8] text-foreground-body">
        {children}
      </ul>
    </div>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <div className="mx-auto max-w-2xl px-6">
      <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-base sm:text-lg leading-[1.8] text-foreground-body">
        {children}
      </ol>
    </div>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-foreground-body">{children}</li>
  ),
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => (
    <a
      href={href}
      className="link-reveal text-brand-primary"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <div className="mx-auto max-w-3xl px-6 my-12">
      <div className="h-px w-12 bg-brand-primary/40 mb-8" />
      <blockquote className="serif-body text-xl text-foreground py-4 border-l-2 border-brand-primary/40 pl-8 sm:text-2xl">
        {children}
      </blockquote>
    </div>
  ),
  hr: () => (
    <div className="mx-auto max-w-2xl px-6">
      <hr className="border-border/50 my-16" />
    </div>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
};

// ── Location distribution ──

function distributeLocations(
  markdownBody: string,
  locations: Location[]
): { chunks: string[]; insertions: Map<number, Location[]> } {
  // Split at ## headings (keeping the heading with its section)
  const sections = markdownBody.split(/(?=^## )/m);
  const insertions = new Map<number, Location[]>();

  if (sections.length <= 1 || locations.length === 0) {
    // Single section or no locations: put all locations after the body
    if (locations.length > 0) {
      insertions.set(sections.length - 1, [...locations]);
    }
    return { chunks: sections, insertions };
  }

  // Distribute evenly between sections
  // We want to place locations after every N sections
  const totalSections = sections.length;
  const totalLocations = locations.length;

  // Calculate: how many sections between each location card
  const gap = Math.max(1, Math.floor(totalSections / (totalLocations + 1)));

  let locationIdx = 0;

  // Place locations after section boundaries
  for (
    let sectionIdx = gap;
    sectionIdx < totalSections && locationIdx < totalLocations;
    sectionIdx += gap
  ) {
    const afterIdx = sectionIdx - 1;
    if (!insertions.has(afterIdx)) {
      insertions.set(afterIdx, []);
    }
    insertions.get(afterIdx)!.push(locations[locationIdx]!);
    locationIdx++;
  }

  // Any remaining locations go after the last section
  while (locationIdx < totalLocations) {
    const lastIdx = totalSections - 1;
    if (!insertions.has(lastIdx)) insertions.set(lastIdx, []);
    insertions.get(lastIdx)!.push(locations[locationIdx]!);
    locationIdx++;
  }

  return { chunks: sections, insertions };
}

export function GuideContentWithLocations({
  body,
  locations,
}: GuideContentWithLocationsProps) {
  const { chunks, insertions } = useMemo(
    () => distributeLocations(body, locations),
    [body, locations]
  );

  let locationCounter = 0;

  return (
    <article className="py-12 sm:py-20 lg:py-28">
      {chunks.map((chunk, i) => (
        <Fragment key={i}>
          <ReactMarkdown components={markdownComponents}>{chunk}</ReactMarkdown>
          {insertions.get(i)?.map((loc) => {
            const idx = locationCounter++;
            return (
              <LocationBreakoutCard
                key={loc.id}
                location={loc}
                layout={idx % 2 === 0 ? "left" : "right"}
                index={idx}
              />
            );
          })}
        </Fragment>
      ))}
    </article>
  );
}
