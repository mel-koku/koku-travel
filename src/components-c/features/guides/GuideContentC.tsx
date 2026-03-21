"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";

type GuideContentCProps = {
  body: string;
};

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1
      className="mt-14 mb-5 text-xl font-bold text-[var(--foreground)] first:mt-0 sm:text-2xl"
      style={{ letterSpacing: "-0.03em" }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2
      className="mt-14 mb-5 text-xl font-bold text-[var(--foreground)] sm:text-2xl"
      style={{ letterSpacing: "-0.03em" }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3
      className="mt-10 mb-3 text-lg font-bold text-[var(--foreground)]"
      style={{ letterSpacing: "-0.01em" }}
    >
      {children}
    </h3>
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
      <p className="mb-6 text-base leading-[1.8] text-[var(--muted-foreground)] sm:text-lg">
        {children}
      </p>
    );
  },
  img: ({ src, alt }: { src?: string | Blob; alt?: string }) => {
    const imgSrc = typeof src === "string" ? src : "";
    return (
      <div className="my-12">
        <div className="relative aspect-[16/9] w-full overflow-hidden border border-[var(--border)]">
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
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {alt}
          </p>
        )}
      </div>
    );
  },
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-6 ml-6 list-outside list-disc space-y-2 text-base leading-[1.8] text-[var(--muted-foreground)] sm:text-lg">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-6 ml-6 list-outside list-decimal space-y-2 text-base leading-[1.8] text-[var(--muted-foreground)] sm:text-lg">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-[var(--muted-foreground)]">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      className="text-[var(--primary)] underline underline-offset-2 hover:opacity-80"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-12">
      <blockquote
        className="border-l-2 border-[var(--primary)] py-4 pl-8 text-xl text-[var(--foreground)] sm:text-2xl"
        style={{ letterSpacing: "-0.01em" }}
      >
        {children}
      </blockquote>
    </div>
  ),
  hr: () => <hr className="my-12 border-[var(--border)]" />,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-[var(--foreground)]">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em>{children}</em>
  ),
};

export function GuideContentC({ body }: GuideContentCProps) {
  return (
    <article className="max-w-2xl">
      <ReactMarkdown components={markdownComponents}>{body}</ReactMarkdown>
    </article>
  );
}
