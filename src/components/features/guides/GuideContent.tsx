"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

type GuideContentProps = {
  body: string;
};

// Stable components object — defined outside the component to avoid
// ReactMarkdown doing unnecessary DOM reconciliation on every render.
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <ScrollReveal className="mx-auto max-w-3xl px-6" distance={30}>
      <h1 className="font-serif text-2xl italic text-foreground mt-20 mb-6 first:mt-0 sm:text-3xl">
        {children}
      </h1>
    </ScrollReveal>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <ScrollReveal className="mx-auto max-w-3xl px-6" distance={30}>
      <h2 className="font-serif text-2xl italic text-foreground mt-20 mb-6 sm:text-3xl">
        {children}
      </h2>
    </ScrollReveal>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <div className="mx-auto max-w-2xl px-6">
      <h3 className="font-serif text-xl italic text-foreground mt-12 mb-4">
        {children}
      </h3>
    </div>
  ),
  p: ({ children, node }: { children?: React.ReactNode; node?: { children?: Array<{ type?: string; tagName?: string }> } }) => {
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
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
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
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
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
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
};

export function GuideContent({ body }: GuideContentProps) {
  return (
    <article className="py-12 sm:py-20 lg:py-28">
      <ReactMarkdown components={markdownComponents}>
        {body}
      </ReactMarkdown>
    </article>
  );
}
