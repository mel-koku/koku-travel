import { groq } from "next-sanity";

export const AUTHOR_FIELDS = groq`{
  _id,
  name,
  "slug": slug.current,
  bio,
  experience,
  expertise,
  languages,
  "avatar": coalesce(avatar.asset->url, profileImage.asset->url),
  "coverImage": coverImage.asset->url,
  location,
  yearsExperience
}`;

export const GUIDE_FIELDS = groq`{
  _id,
  title,
  headline,
  summary,
  categories,
  location,
  featured,
  "slug": slug.current,
  "image": coverImage.asset->url,
  "imageMeta": coverImage.asset->metadata,
  "publishedAt": coalesce(publishedAt, _updatedAt, _createdAt),
  "author": author-> {
    _id,
    name,
    "slug": slug.current,
    bio,
    experience,
    expertise,
    languages,
    "avatar": coalesce(avatar.asset->url, profileImage.asset->url),
    "coverImage": coverImage.asset->url,
    location,
    yearsExperience
  }
}`;

export const ALL_GUIDES_QUERY = groq`*[_type == "guide"] | order(publishedAt desc, _createdAt desc) ${GUIDE_FIELDS}`;

export const GUIDE_BY_SLUG_QUERY = groq`*[_type == "guide" && slug.current == $slug][0] ${GUIDE_FIELDS}`;

export const ALL_AUTHORS_QUERY = groq`*[_type == "author"] | order(name asc) ${AUTHOR_FIELDS}`;

export const AUTHOR_BY_SLUG_QUERY = groq`*[_type == "author" && slug.current == $slug][0] ${AUTHOR_FIELDS}`;

export const GUIDES_BY_AUTHOR_QUERY = groq`*[_type == "guide" && author._ref == $authorId] | order(publishedAt desc, _createdAt desc) ${GUIDE_FIELDS}`;

