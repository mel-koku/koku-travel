/**
 * Default social-share image for pages that don't specify their own.
 *
 * Next.js doesn't deeply-merge page-level `openGraph` with the root
 * metadata — a page's openGraph object fully replaces the parent. So
 * any page that defines its own openGraph to customize title or
 * description must also explicitly include images, or it'll ship
 * without a social preview.
 *
 * Import this constant in each page's generateMetadata / metadata
 * openGraph + twitter blocks.
 *
 * Replace the asset with a dedicated 1200×630 OG image when branding
 * is ready; fallback.jpg is 800×533, which renders but may crop on
 * some platforms.
 */
export const DEFAULT_OG_IMAGES = [
  {
    url: "/images/fallback.jpg",
    width: 800,
    height: 533,
    alt: "Yuku Japan",
  },
];

export const DEFAULT_TWITTER_IMAGES = ["/images/fallback.jpg"];
