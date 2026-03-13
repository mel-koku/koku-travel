const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kokutravel.com";

type GuideJsonLdInput = {
  slug: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  authorName?: string;
  publishedAt?: string;
  updatedAt?: string;
};

/**
 * Build JSON-LD structured data for a guide/article detail page.
 */
export function buildGuideJsonLd(guide: GuideJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    ...(guide.summary && { description: guide.summary }),
    url: `${BASE_URL}/guides/${guide.slug}`,
    ...(guide.imageUrl && { image: guide.imageUrl }),
    ...(guide.publishedAt && { datePublished: guide.publishedAt }),
    ...(guide.updatedAt && { dateModified: guide.updatedAt }),
    author: {
      "@type": "Organization",
      name: guide.authorName ?? "Koku Travel",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Koku Travel",
      url: BASE_URL,
    },
    isPartOf: {
      "@type": "WebSite",
      name: "Koku Travel",
      url: BASE_URL,
    },
  };
}
