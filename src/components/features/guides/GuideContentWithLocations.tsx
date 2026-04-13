"use client";

import { Fragment, useMemo } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { LocationBreakoutCard } from "./LocationBreakoutCard";
import { isSafeUrl } from "@/lib/utils/urlSafety";
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
  }) => {
    // Gate LLM/Sanity-sourced hrefs through the safety check so
    // javascript:/data:/vbscript: URLs can't execute.
    const safe = isSafeUrl(href);
    return (
      <a
        href={safe ? href : undefined}
        className="link-reveal text-brand-primary"
        target={safe && href?.startsWith("http") ? "_blank" : undefined}
        rel={safe && href?.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
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

/**
 * Build search tokens from a location name for fuzzy matching against prose.
 * Returns lowercase fragments: full name, plus any multi-char words.
 * e.g. "Suzumushidera Temple" -> ["suzumushidera temple", "suzumushidera", "temple"]
 */
function nameTokens(name: string): string[] {
  const lower = name.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 2);
  return [lower, ...words];
}

/**
 * Score how well a section's text matches a location.
 * Returns 0 (no match) or a positive score (higher = better match).
 */
function sectionMatchScore(sectionText: string, location: Location): number {
  const text = sectionText.toLowerCase();
  const tokens = nameTokens(location.name);

  // Full name match is strongest signal
  if (tokens[0] && text.includes(tokens[0])) return 10;

  // Count individual word hits (skip very common words like "the", "of")
  const skipWords = new Set([
    "the",
    "and",
    "temple",
    "shrine",
    "park",
    "garden",
    "museum",
    "castle",
    "market",
    "station",
    "tower",
    "bridge",
  ]);
  let wordHits = 0;
  for (let i = 1; i < tokens.length; i++) {
    if (!skipWords.has(tokens[i]!) && text.includes(tokens[i]!)) {
      wordHits++;
    }
  }

  // Need at least one distinctive word match
  return wordHits >= 1 ? wordHits * 3 : 0;
}

function distributeLocations(
  markdownBody: string,
  locations: Location[]
): { chunks: string[]; insertions: Map<number, Location[]> } {
  // Split at ## headings (keeping the heading with its section)
  const sections = markdownBody.split(/(?=^## )/m);
  const insertions = new Map<number, Location[]>();

  if (sections.length <= 1 || locations.length === 0) {
    if (locations.length > 0) {
      insertions.set(sections.length - 1, [...locations]);
    }
    return { chunks: sections, insertions };
  }

  // Phase 1: Match locations to sections by name mention
  const matched = new Set<number>(); // location indices already placed
  const sectionClaimed = new Set<number>(); // sections that have a matched card

  for (let locIdx = 0; locIdx < locations.length; locIdx++) {
    let bestSection = -1;
    let bestScore = 0;

    for (let secIdx = 0; secIdx < sections.length; secIdx++) {
      const score = sectionMatchScore(sections[secIdx]!, locations[locIdx]!);
      if (score > bestScore) {
        bestScore = score;
        bestSection = secIdx;
      }
    }

    if (bestSection >= 0) {
      if (!insertions.has(bestSection)) insertions.set(bestSection, []);
      insertions.get(bestSection)!.push(locations[locIdx]!);
      matched.add(locIdx);
      sectionClaimed.add(bestSection);
    }
  }

  // Phase 2: Distribute unmatched locations evenly across unclaimed sections
  const unmatched = locations.filter((_, i) => !matched.has(i));
  if (unmatched.length > 0) {
    // Find sections without a matched card (candidates for placement)
    const openSections = Array.from(
      { length: sections.length },
      (_, i) => i
    ).filter((i) => !sectionClaimed.has(i));

    if (openSections.length === 0) {
      // All sections claimed; append remaining after last section
      const lastIdx = sections.length - 1;
      if (!insertions.has(lastIdx)) insertions.set(lastIdx, []);
      insertions.get(lastIdx)!.push(...unmatched);
    } else {
      const gap = Math.max(
        1,
        Math.floor(openSections.length / (unmatched.length + 1))
      );
      let unmatchedIdx = 0;

      for (
        let step = gap;
        step < openSections.length && unmatchedIdx < unmatched.length;
        step += gap
      ) {
        const secIdx = openSections[step]!;
        if (!insertions.has(secIdx)) insertions.set(secIdx, []);
        insertions.get(secIdx)!.push(unmatched[unmatchedIdx]!);
        unmatchedIdx++;
      }

      // Remaining unmatched go after the last section
      while (unmatchedIdx < unmatched.length) {
        const lastIdx = sections.length - 1;
        if (!insertions.has(lastIdx)) insertions.set(lastIdx, []);
        insertions.get(lastIdx)!.push(unmatched[unmatchedIdx]!);
        unmatchedIdx++;
      }
    }
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
