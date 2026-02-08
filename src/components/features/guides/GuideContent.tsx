"use client";

import ReactMarkdown from "react-markdown";

type GuideContentProps = {
  body: string;
};

export function GuideContent({ body }: GuideContentProps) {
  return (
    <article className="prose prose-lg max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground-secondary prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-ul:text-foreground-secondary prose-ol:text-foreground-secondary prose-li:marker:text-sage">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-foreground-secondary leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-foreground-secondary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-foreground-secondary">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-foreground-secondary">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-brand-primary hover:underline"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-sage/50 pl-4 py-1 my-4 italic text-foreground-secondary bg-surface rounded-r">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-border" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  );
}
