-- RPC function to aggregate filter metadata server-side.
-- Replaces client-side aggregation that fetched all 6,000+ locations
-- and counted in JavaScript. This returns pre-aggregated counts
-- directly from PostgreSQL in a single query.

CREATE OR REPLACE FUNCTION get_filter_metadata()
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'cities', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.value), '[]'::json)
      FROM (
        SELECT city AS value, city AS label, count(*)::int AS count
        FROM locations
        WHERE is_active = true AND is_accommodation = false AND city IS NOT NULL
        GROUP BY city
        ORDER BY city
      ) t
    ),
    'categories', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.value), '[]'::json)
      FROM (
        SELECT category AS value, category AS label, count(*)::int AS count
        FROM locations
        WHERE is_active = true AND is_accommodation = false AND category IS NOT NULL
        GROUP BY category
        ORDER BY category
      ) t
    ),
    'regions', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.value), '[]'::json)
      FROM (
        SELECT region AS value, region AS label, count(*)::int AS count
        FROM locations
        WHERE is_active = true AND is_accommodation = false AND region IS NOT NULL
        GROUP BY region
        ORDER BY region
      ) t
    ),
    'prefectures', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.value), '[]'::json)
      FROM (
        SELECT
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(prefecture, '\s+Prefecture$', '', 'i'),
              '-ken$', '', 'i'),
            '-fu$', '', 'i'),
          '-to$', '', 'i') AS value,
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(prefecture, '\s+Prefecture$', '', 'i'),
              '-ken$', '', 'i'),
            '-fu$', '', 'i'),
          '-to$', '', 'i') AS label,
          count(*)::int AS count
        FROM locations
        WHERE is_active = true AND is_accommodation = false AND prefecture IS NOT NULL
        GROUP BY value
        ORDER BY value
      ) t
    ),
    'neighborhoods', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.value), '[]'::json)
      FROM (
        SELECT neighborhood AS value, neighborhood AS label, count(*)::int AS count
        FROM locations
        WHERE is_active = true AND is_accommodation = false AND neighborhood IS NOT NULL
        GROUP BY neighborhood
        ORDER BY neighborhood
      ) t
    )
  );
$$;
