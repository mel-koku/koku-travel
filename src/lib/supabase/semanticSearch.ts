/**
 * Semantic search helpers for pgvector cosine similarity queries.
 *
 * Queries are executed via Supabase RPC functions (defined in migrations).
 * This module provides parameter builders and constants.
 */

/** Minimum cosine similarity to include in results */
export const SIMILARITY_THRESHOLD = 0.3;

/** Minimum similar results needed to show the section */
export const MIN_SIMILAR_RESULTS = 2;

/** Max similar places to return */
export const SIMILAR_PLACES_LIMIT = 6;

/** Max semantic search results */
export const SEMANTIC_SEARCH_LIMIT = 10;
