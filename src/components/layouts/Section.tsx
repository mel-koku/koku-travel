import { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Container } from "./Container";

export type SectionProps = {
  /**
   * Optional heading rendered as an <h2>.
   */
  title?: string;
  /**
   * Supporting description rendered beneath the title.
   */
  description?: string;
  /**
   * When true, allows the section background to stretch full width while
   * preserving the inner container max-width.
   */
  bleed?: boolean;
  /**
   * Additional classes applied to the outer section element.
   */
  className?: string;
  children: ReactNode;
};

const headingBlockSpacing = "mb-6 sm:mb-8 md:mb-10";

/**
 * Establishes vertical rhythm and an optional heading group for content bands.
 */
export function Section({
  title,
  description,
  bleed = false,
  className,
  children,
}: SectionProps) {
  const outerClassName = cn("w-full", className);
  const containerClassName = cn(
    "py-10 sm:py-12 md:py-16",
    bleed && "px-0",
  );

  return (
    <section className={outerClassName}>
      <Container className={containerClassName}>
        {(title || description) && (
          <div className={headingBlockSpacing}>
            {title && (
              <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="text-gray-600 max-w-2xl">{description}</p>
            )}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}


