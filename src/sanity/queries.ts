import { groq } from "next-sanity";

/** Full guide with expanded author and resolved images */
export const guideBySlugQuery = groq`
  *[_type == "guide" && slug.current == $slug && editorialStatus == "published"][0] {
    _id,
    title,
    "slug": slug.current,
    subtitle,
    summary,
    body[] {
      ...,
      _type == "image" => {
        ...,
        "url": asset->url,
        "dimensions": asset->metadata.dimensions
      }
    },
    "featuredImage": featuredImage {
      ...,
      "url": asset->url,
      "dimensions": asset->metadata.dimensions
    },
    "thumbnailImage": thumbnailImage {
      ...,
      "url": asset->url,
      "dimensions": asset->metadata.dimensions
    },
    author-> {
      name,
      "slug": slug.current,
      "photo": photo {
        ...,
        "url": asset->url
      },
      bio,
      city,
      socialLinks
    },
    guideType,
    tags,
    city,
    region,
    "locationIds": locationIds[].locationId,
    readingTimeMinutes,
    editorialStatus,
    featured,
    sortOrder,
    publishedAt,
    _createdAt,
    _updatedAt
  }
`;

/** Author with count of published guides */
export const authorBySlugQuery = groq`
  *[_type == "author" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    "photo": photo {
      ...,
      "url": asset->url
    },
    bio,
    city,
    socialLinks,
    "guideCount": count(*[_type == "guide" && references(^._id) && editorialStatus == "published"]),
    "guides": *[_type == "guide" && references(^._id) && editorialStatus == "published"] | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      summary,
      "featuredImage": featuredImage.asset->url,
      guideType,
      city,
      region,
      readingTimeMinutes,
      tags,
      publishedAt
    }
  }
`;

/** All authors for directory page */
export const allAuthorsQuery = groq`
  *[_type == "author"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "photo": photo {
      ...,
      "url": asset->url
    },
    bio,
    city,
    "guideCount": count(*[_type == "guide" && references(^._id) && editorialStatus == "published"])
  }
`;

/** Landing page singleton with resolved image URLs */
export const landingPageQuery = groq`
  *[_type == "landingPage"][0] {
    heroHeadline,
    heroTagline,
    heroDescription,
    heroPrimaryCtaText,
    heroSecondaryCtaText,
    "heroImage": heroImage {
      ...,
      "url": asset->url
    },
    philosophyEyebrow,
    philosophyHeading,
    "philosophyImage": philosophyImage {
      ...,
      "url": asset->url
    },
    philosophyStats,
    showcaseActs[] {
      number,
      eyebrow,
      title,
      description,
      "image": image {
        ...,
        "url": asset->url
      },
      alt
    },
    featuredLocationsEyebrow,
    featuredLocationsHeading,
    featuredLocationsDescription,
    featuredLocationsCtaText,
    featuredExperiencesEyebrow,
    featuredExperiencesHeading,
    featuredExperiencesDescription,
    featuredExperiencesCtaText,
    testimonials[] {
      quote,
      authorName,
      authorLocation,
      "image": image {
        ...,
        "url": asset->url
      },
      alt
    },
    featuredGuidesEyebrow,
    featuredGuidesHeading,
    featuredGuidesDescription,
    featuredGuidesCtaText,
    seasonalSpotlightEyebrow,
    seasonalSpotlightSpringHeading,
    seasonalSpotlightSummerHeading,
    seasonalSpotlightAutumnHeading,
    seasonalSpotlightWinterHeading,
    seasonalSpotlightDescription,
    seasonalSpotlightCtaText,
    finalCtaHeading,
    finalCtaDescription,
    finalCtaPrimaryText,
    finalCtaSecondaryText,
    finalCtaSubtext,
    "finalCtaImage": finalCtaImage {
      ...,
      "url": asset->url
    }
  }
`;

/** Site settings singleton */
export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    brandDescription,
    newsletterLabel,
    newsletterButtonText,
    footerNavColumns[] {
      title,
      links[] {
        label,
        href
      }
    },
    socialLinks[] {
      platform,
      url,
      label
    }
  }
`;

/** Trip builder config singleton with resolved image URLs */
export const tripBuilderConfigQuery = groq`
  *[_type == "tripBuilderConfig"][0] {
    vibes[] {
      vibeId,
      name,
      description,
      icon,
      "image": image {
        ...,
        "url": asset->url
      }
    },
    regions[] {
      regionId,
      name,
      tagline,
      description,
      highlights,
      "heroImage": heroImage {
        ...,
        "url": asset->url
      },
      "galleryImages": galleryImages[] {
        ...,
        "url": asset->url
      }
    },
    introHeading,
    introSubheading,
    introDescription,
    introCtaText,
    "introBackgroundImage": introBackgroundImage {
      ...,
      "url": asset->url
    },
    introEyebrow,
    "introAccentImage": introAccentImage {
      ...,
      "url": asset->url
    },
    introImageCaption,
    dateStepHeading,
    dateStepDescription,
    "dateStepBackgroundImage": dateStepBackgroundImage {
      ...,
      "url": asset->url
    },
    dateStepStartLabel,
    dateStepEndLabel,
    entryPointHeading,
    entryPointDescription,
    entryPointChangeText,
    entryPointSearchPlaceholder,
    entryPointNoResults,
    entryPointPopularLabel,
    vibeStepHeading,
    vibeStepDescription,
    vibeStepMaxWarning,
    regionStepHeading,
    regionStepDescription,
    reviewHeading,
    reviewDescription,
    reviewSavedPlacesLabel,
    reviewBudgetTitle,
    reviewBudgetTooltip,
    reviewPaceTitle,
    reviewPaceTooltip,
    reviewGroupTitle,
    reviewGroupTooltip,
    reviewAccessTitle,
    reviewAccessTooltip,
    reviewDietaryLabel,
    reviewNotesTitle,
    reviewNotesTooltip,
    reviewNotesPlaceholder,
    generatingHeading,
    generatingMessages,
    navBackLabel,
    navContinueLabel,
    navSkipLabel,
    navStartPlanningLabel,
    navGenerateLabel,
    navStartOverConfirmation
  }
`;

/** Full experience with expanded author and resolved images */
export const experienceBySlugQuery = groq`
  *[_type == "experience" && slug.current == $slug && editorialStatus == "published"][0] {
    _id,
    title,
    "slug": slug.current,
    subtitle,
    summary,
    body[] {
      ...,
      _type == "image" => {
        ...,
        "url": asset->url,
        "dimensions": asset->metadata.dimensions
      }
    },
    "featuredImage": featuredImage {
      ...,
      "url": asset->url,
      "dimensions": asset->metadata.dimensions
    },
    "thumbnailImage": thumbnailImage {
      ...,
      "url": asset->url,
      "dimensions": asset->metadata.dimensions
    },
    author-> {
      name,
      "slug": slug.current,
      "photo": photo {
        ...,
        "url": asset->url
      },
      bio,
      city,
      socialLinks
    },
    experienceType,
    duration,
    groupSizeMin,
    groupSizeMax,
    difficulty,
    bestSeason,
    meetingPoint,
    whatsIncluded,
    whatToBring,
    nearestStation,
    estimatedCost,
    bookingUrl,
    tags,
    city,
    region,
    "locationIds": locationIds[].locationId,
    readingTimeMinutes,
    editorialStatus,
    featured,
    sortOrder,
    publishedAt,
    _createdAt,
    _updatedAt
  }
`;

/** Featured experiences for landing page */
export const featuredExperiencesQuery = groq`
  *[_type == "experience" && editorialStatus == "published" && featured == true] | order(sortOrder asc) [0...$limit] {
    _id,
    title,
    "slug": slug.current,
    summary,
    "featuredImage": featuredImage {
      ...,
      "url": asset->url
    },
    "thumbnailImage": thumbnailImage {
      ...,
      "url": asset->url
    },
    experienceType,
    duration,
    difficulty,
    estimatedCost,
    city,
    region,
    readingTimeMinutes,
    tags,
    publishedAt
  }
`;

/** All published experiences for listing page */
export const allPublishedExperiencesQuery = groq`
  *[_type == "experience" && editorialStatus == "published"] | order(sortOrder asc, publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    subtitle,
    summary,
    "featuredImage": featuredImage {
      ...,
      "url": asset->url
    },
    "thumbnailImage": thumbnailImage {
      ...,
      "url": asset->url
    },
    experienceType,
    duration,
    difficulty,
    estimatedCost,
    city,
    region,
    "locationIds": locationIds[].locationId,
    readingTimeMinutes,
    tags,
    publishedAt
  }
`;

/** Pages content singleton */
export const pagesContentQuery = groq`
  *[_type == "pagesContent"][0] {
    placesHeading,
    placesSubtitle,
    placesErrorMessage,
    placesRetryText,
    placesEndMessage,
    experiencesHeading,
    experiencesDescription,
    experiencesEmptyHeading,
    experiencesEmptyDescription,
    experiencesFilteredEmptyHeading,
    experiencesFilteredEmptyDescription,
    guidesHeading,
    guidesDescription,
    guidesEmptyHeading,
    guidesEmptyDescription,
    guidesFilteredEmptyHeading,
    guidesFilteredEmptyDescription,
    authorsEyebrow,
    authorsHeading,
    authorsSubtitle,
    authorsEmptyState,
    savedEyebrow,
    savedTitle,
    savedSubtitleWithCount,
    savedSubtitleEmpty,
    "savedBackgroundImage": savedBackgroundImage {
      ...,
      "url": asset->url
    },
    dashboardEyebrow,
    dashboardSubtitle,
    dashboardActivityEyebrow,
    dashboardActivityHeading,
    dashboardTripsEyebrow,
    dashboardTripsHeading,
    dashboardEmptyHeading,
    dashboardEmptyDescription,
    dashboardPlanButton,
    dashboardAccountEyebrow,
    dashboardAccountHeading,
    dashboardDeleteToastTitle,
    dashboardUndoButton,
    accountEyebrow,
    accountTitle,
    accountSubtitle,
    accountProfileHeading,
    accountSignOutText,
    accountDisplayNameLabel,
    accountClearDataText,
    accountEmailLabel,
    accountEmailPlaceholder,
    accountSendLinkText,
    signInHeading,
    signInDescription,
    "signInBackgroundImage": signInBackgroundImage {
      ...,
      "url": asset->url
    },
    signInFormHeading,
    signInFormDescription,
    signInSubmitText,
    signInNoAccountText,
    signInGuestText,
    notFoundEyebrow,
    notFoundHeading,
    notFoundDescription,
    notFoundPrimaryCtaText,
    notFoundSecondaryCtaText,
    "notFoundBackgroundImage": notFoundBackgroundImage {
      ...,
      "url": asset->url
    },
    itineraryLoadingText,
    itineraryEmptyState,
    itineraryBuilderLink
  }
`;
