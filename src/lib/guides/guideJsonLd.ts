const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://yukujapan.com").replace(/\/+$/, "");

/**
 * JSON-LD `image` must be an absolute URL — Google's structured-data
 * validator rejects relative paths. Resolve against BASE_URL when needed.
 */
function absoluteImageUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

type GuideJsonLdInput = {
  slug: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  authorName?: string;
  authorSlug?: string;
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
    ...(guide.imageUrl && { image: absoluteImageUrl(guide.imageUrl) }),
    ...(guide.publishedAt && { datePublished: guide.publishedAt }),
    ...(guide.updatedAt && { dateModified: guide.updatedAt }),
    author: guide.authorName && guide.authorName !== "Yuku Japan"
      ? {
          "@type": "Person",
          name: guide.authorName,
          ...(guide.authorSlug && { url: `${BASE_URL}/local-experts?person=${guide.authorSlug}` }),
        }
      : {
          "@type": "Organization",
          name: "Yuku Japan",
          url: BASE_URL,
        },
    publisher: {
      "@type": "Organization",
      name: "Yuku Japan",
      url: BASE_URL,
    },
    isPartOf: {
      "@type": "WebSite",
      name: "Yuku Japan",
      url: BASE_URL,
    },
  };
}
