import { sanityClient } from "@/sanity/client";
import {
  blogPostBySlugQuery,
  allPublishedBlogPostsQuery,
  allBlogPostSlugsQuery,
} from "@/sanity/queries";
import type { SanityBlogPost, SanityBlogPostSummary } from "@/types/sanityBlog";
import { readFileCache, readFileCacheStale, writeFileCache } from "@/lib/api/fileCache";

const SANITY_TIMEOUT_MS = 4000;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchWithCache<T>(key: string, query: string, params?: Record<string, unknown>): Promise<T | null> {
  const memKey = `__sanity_blog_${key}` as const;
  const _g = globalThis as Record<string, unknown>;
  const memCached = _g[memKey] as { data: T; at: number } | undefined;
  if (memCached && Date.now() - memCached.at < CACHE_TTL) {
    return memCached.data;
  }

  const fileCached = readFileCache<T>(`sanity-blog-${key}`, CACHE_TTL);
  if (fileCached) {
    _g[memKey] = { data: fileCached, at: Date.now() };
    return fileCached;
  }

  try {
    const result = await Promise.race([
      params ? sanityClient.fetch<T | null>(query, params) : sanityClient.fetch<T | null>(query),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SANITY_TIMEOUT_MS)),
    ]);

    if (result) {
      _g[memKey] = { data: result, at: Date.now() };
      writeFileCache(`sanity-blog-${key}`, result);
      return result;
    }

    const stale = readFileCacheStale<T>(`sanity-blog-${key}`);
    if (stale) {
      _g[memKey] = { data: stale, at: Date.now() };
      return stale;
    }
    return null;
  } catch {
    const stale = readFileCacheStale<T>(`sanity-blog-${key}`);
    if (stale) {
      _g[memKey] = { data: stale, at: Date.now() };
      return stale;
    }
    return null;
  }
}

export async function getBlogPostBySlug(slug: string): Promise<SanityBlogPost | null> {
  return fetchWithCache<SanityBlogPost>(`post-${slug}`, blogPostBySlugQuery, { slug });
}

export async function getPublishedBlogPosts(): Promise<SanityBlogPostSummary[]> {
  const result = await fetchWithCache<SanityBlogPostSummary[]>("all-posts", allPublishedBlogPostsQuery);
  return result ?? [];
}

export async function getAllBlogPostSlugs(): Promise<string[]> {
  const result = await fetchWithCache<string[]>("all-slugs", allBlogPostSlugsQuery);
  return result ?? [];
}
