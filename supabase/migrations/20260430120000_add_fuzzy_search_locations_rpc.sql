-- RPC for trigram-similarity fuzzy search across locations.
--
-- Catches typos and Japanese-name transliterations that FTS misses
-- (e.g. "amemura" → "Amerika-Mura"). Uses the existing pg_trgm extension
-- and the idx_locations_name_trigram GIN index installed in
-- 20260121_add_performance_indexes.sql.
--
-- Returns matches against `name` AND `name_japanese` (transliterations of
-- Japanese names often differ in spelling from the English form).
--
-- Behavior parity with FTS path: matches both top-level AND child rows
-- (semantic_search_locations only returns top-level — that's intentional
-- for conceptual queries; here we want maximum recall on typos).

CREATE OR REPLACE FUNCTION fuzzy_search_locations(
  search_query text,
  match_limit int DEFAULT 10,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id text,
  name text,
  city text,
  region text,
  category text,
  place_id text,
  image text,
  primary_photo_url text,
  rating numeric,
  parent_id text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set the trigram similarity threshold for the % operator. Default in
  -- Postgres is 0.3; we expose it as a parameter for tuning per call.
  PERFORM set_limit(similarity_threshold);

  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.city,
    l.region,
    l.category,
    l.place_id,
    l.image,
    l.primary_photo_url,
    l.rating,
    l.parent_id,
    GREATEST(
      similarity(l.name, search_query),
      COALESCE(similarity(l.name_japanese, search_query), 0)
    )::float AS similarity
  FROM locations l
  WHERE l.is_active = true
    AND (
      l.name % search_query
      OR (l.name_japanese IS NOT NULL AND l.name_japanese % search_query)
    )
  ORDER BY GREATEST(
      similarity(l.name, search_query),
      COALESCE(similarity(l.name_japanese, search_query), 0)
    ) DESC,
    l.name ASC
  LIMIT match_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION fuzzy_search_locations(text, int, float) TO anon, authenticated, service_role;
