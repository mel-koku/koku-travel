import { groq } from "next-sanity";

export const GUIDE_FIELDS = groq`{
  _id,
  name,
  headline,
  summary,
  categories,
  languages,
  featured,
  experience,
  "slug": slug.current,
  "image": profileImage.asset->url,
  "imageMeta": profileImage.asset->metadata,
  "publishedAt": coalesce(_updatedAt, _createdAt)
}`;

export const ALL_GUIDES_QUERY = groq`*[_type == "guide"] | order(name asc) ${GUIDE_FIELDS}`;

export const GUIDE_BY_SLUG_QUERY = groq`*[_type == "guide" && slug.current == $slug][0] ${GUIDE_FIELDS}`;

