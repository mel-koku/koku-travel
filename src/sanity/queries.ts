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
