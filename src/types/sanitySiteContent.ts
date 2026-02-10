import type { SanityImageAsset } from "./sanityGuide";

export type LandingPageContent = {
  // Hero
  heroTagline?: string;
  heroDescription?: string;
  heroPrimaryCtaText?: string;
  heroSecondaryCtaText?: string;
  heroImage?: SanityImageAsset & { url?: string };

  // Philosophy
  philosophyEyebrow?: string;
  philosophyHeading?: string;
  philosophyImage?: SanityImageAsset & { url?: string };
  philosophyStats?: Array<{
    value: string;
    suffix?: string;
    label: string;
  }>;

  // Showcase
  showcaseActs?: Array<{
    number: string;
    eyebrow: string;
    title: string;
    description: string;
    image: SanityImageAsset & { url?: string };
    alt: string;
  }>;

  // Featured Locations section header
  featuredLocationsEyebrow?: string;
  featuredLocationsHeading?: string;
  featuredLocationsDescription?: string;

  // Testimonials
  testimonials?: Array<{
    quote: string;
    authorName: string;
    authorLocation: string;
    image: SanityImageAsset & { url?: string };
    alt: string;
  }>;

  // Featured Guides section header
  featuredGuidesEyebrow?: string;
  featuredGuidesHeading?: string;
  featuredGuidesDescription?: string;

  // Final CTA
  finalCtaHeading?: string;
  finalCtaDescription?: string;
  finalCtaPrimaryText?: string;
  finalCtaSecondaryText?: string;
  finalCtaSubtext?: string;
  finalCtaImage?: SanityImageAsset & { url?: string };
};

export type SiteSettings = {
  brandDescription?: string;
  newsletterLabel?: string;
  newsletterButtonText?: string;
  footerNavColumns?: Array<{
    title: string;
    links: Array<{
      label: string;
      href: string;
    }>;
  }>;
  socialLinks?: Array<{
    platform: string;
    url: string;
    label: string;
  }>;
};

export type TripBuilderConfig = {
  vibes?: Array<{
    vibeId: string;
    name: string;
    description: string;
    icon?: string;
    image?: SanityImageAsset & { url?: string };
  }>;
  regions?: Array<{
    regionId: string;
    name: string;
    tagline: string;
    description: string;
    highlights?: string[];
    heroImage?: SanityImageAsset & { url?: string };
  }>;
};
