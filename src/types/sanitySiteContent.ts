import type { SanityImageAsset } from "./sanityGuide";

export type LandingPageContent = {
  // Hero
  heroHeadline?: string;
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

  // Featured Experiences section header
  featuredExperiencesEyebrow?: string;
  featuredExperiencesHeading?: string;
  featuredExperiencesDescription?: string;

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

  // Intro Step
  introHeading?: string;
  introSubheading?: string;
  introDescription?: string;
  introCtaText?: string;
  introBackgroundImage?: SanityImageAsset & { url?: string };
  introEyebrow?: string;
  introAccentImage?: SanityImageAsset & { url?: string };
  introImageCaption?: string;

  // Date Step
  dateStepHeading?: string;
  dateStepDescription?: string;
  dateStepBackgroundImage?: SanityImageAsset & { url?: string };
  dateStepStartLabel?: string;
  dateStepEndLabel?: string;

  // Entry Point Step
  entryPointHeading?: string;
  entryPointDescription?: string;
  entryPointChangeText?: string;
  entryPointSearchPlaceholder?: string;
  entryPointNoResults?: string;
  entryPointPopularLabel?: string;

  // Vibe Step
  vibeStepHeading?: string;
  vibeStepDescription?: string;
  vibeStepMaxWarning?: string;

  // Region Step
  regionStepHeading?: string;
  regionStepDescription?: string;

  // Review Step
  reviewHeading?: string;
  reviewDescription?: string;
  reviewSavedPlacesLabel?: string;
  reviewBudgetTitle?: string;
  reviewBudgetTooltip?: string;
  reviewPaceTitle?: string;
  reviewPaceTooltip?: string;
  reviewGroupTitle?: string;
  reviewGroupTooltip?: string;
  reviewAccessTitle?: string;
  reviewAccessTooltip?: string;
  reviewDietaryLabel?: string;
  reviewNotesTitle?: string;
  reviewNotesTooltip?: string;
  reviewNotesPlaceholder?: string;

  // Generating Overlay
  generatingHeading?: string;
  generatingMessages?: string[];

  // Navigation Labels
  navBackLabel?: string;
  navContinueLabel?: string;
  navSkipLabel?: string;
  navStartPlanningLabel?: string;
  navGenerateLabel?: string;
  navStartOverConfirmation?: string;
};

export type PagesContent = {
  // Explore
  exploreHeading?: string;
  exploreSubtitle?: string;
  exploreErrorMessage?: string;
  exploreRetryText?: string;
  exploreEndMessage?: string;

  // Guides Listing
  guidesEmptyHeading?: string;
  guidesEmptyDescription?: string;
  guidesFilteredEmptyHeading?: string;
  guidesFilteredEmptyDescription?: string;

  // Authors
  authorsEyebrow?: string;
  authorsHeading?: string;
  authorsSubtitle?: string;
  authorsEmptyState?: string;

  // Favorites
  favoritesEyebrow?: string;
  favoritesTitle?: string;
  favoritesSubtitleWithCount?: string;
  favoritesSubtitleEmpty?: string;
  favoritesBackgroundImage?: SanityImageAsset & { url?: string };

  // Dashboard
  dashboardEyebrow?: string;
  dashboardSubtitle?: string;
  dashboardActivityEyebrow?: string;
  dashboardActivityHeading?: string;
  dashboardTripsEyebrow?: string;
  dashboardTripsHeading?: string;
  dashboardEmptyHeading?: string;
  dashboardEmptyDescription?: string;
  dashboardPlanButton?: string;
  dashboardAccountEyebrow?: string;
  dashboardAccountHeading?: string;
  dashboardDeleteToastTitle?: string;
  dashboardUndoButton?: string;

  // Account
  accountEyebrow?: string;
  accountTitle?: string;
  accountSubtitle?: string;
  accountProfileHeading?: string;
  accountSignOutText?: string;
  accountDisplayNameLabel?: string;
  accountClearDataText?: string;
  accountEmailLabel?: string;
  accountEmailPlaceholder?: string;
  accountSendLinkText?: string;

  // Itinerary
  itineraryLoadingText?: string;
  itineraryEmptyState?: string;
  itineraryBuilderLink?: string;
};
