const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://yukujapan.com").replace(/\/+$/, "");

type BreadcrumbItem = {
  name: string;
  /** Path relative to the site root, e.g. "/guides/kyoto-in-three-days". Will be joined with NEXT_PUBLIC_SITE_URL. */
  path: string;
};

export type BreadcrumbListSchema = {
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
};

/**
 * Builds a schema.org BreadcrumbList suitable for embedding inside a JSON-LD
 * `@graph` alongside the primary page schema. Callers supply breadcrumb items
 * in navigation order (root first, current page last).
 */
export function buildBreadcrumbList(items: BreadcrumbItem[]): BreadcrumbListSchema {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

/**
 * Convenience: wraps a page's primary schema + breadcrumbs into a single
 * `@graph` JSON-LD document. Strips the nested `@context` from the inner
 * schema so the outer context applies to both.
 */
export function buildJsonLdGraph(
  primarySchema: Record<string, unknown>,
  breadcrumbs: BreadcrumbListSchema,
): Record<string, unknown> {
  // Strip the redundant nested @context; the outer graph supplies it.
  const { "@context": _nestedContext, ...primaryWithoutContext } = primarySchema;
  void _nestedContext;
  return {
    "@context": "https://schema.org",
    "@graph": [primaryWithoutContext, breadcrumbs],
  };
}
