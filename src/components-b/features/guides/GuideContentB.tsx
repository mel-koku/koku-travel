"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";

type GuideContentBProps = {
  body: string;
};

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-bold text-[var(--foreground)] mt-12 mb-4 first:mt-0 sm:text-2xl">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-[var(--foreground)] mt-12 mb-4 sm:text-2xl">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-semibold text-[var(--foreground)] mt-10 mb-3">
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
      <p className="text-base sm:text-lg leading-[1.8] text-[var(--foreground-body)] mb-6">
        {children}
      </p>
    );
  },
  img: ({ src, alt }: { src?: string | Blob; alt?: string }) => {
    const imgSrc = typeof src === "string" ? src : "";
    return (
      <div className="my-12">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
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
          <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
            {alt}
          </p>
        )}
      </div>
    );
  },
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-base sm:text-lg leading-[1.8] text-[var(--foreground-body)]">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-base sm:text-lg leading-[1.8] text-[var(--foreground-body)]">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-[var(--foreground-body)]">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      className="text-[var(--primary)] hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-10">
      <blockquote className="text-xl text-[var(--foreground)] py-4 border-l-2 border-[var(--primary)]/40 pl-8 sm:text-2xl">
        {children}
      </blockquote>
    </div>
  ),
  hr: () => <hr className="border-[var(--border)]/50 my-12" />,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-[var(--foreground)]">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
};

export function GuideContentB({ body }: GuideContentBProps) {
  return (
    <article className="max-w-2xl">
      <ReactMarkdown components={markdownComponents}>{body}</ReactMarkdown>
    </article>
  );
}
