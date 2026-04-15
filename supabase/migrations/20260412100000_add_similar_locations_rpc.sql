-- RPC function for finding similar locations by embedding vector
CREATE OR REPLACE FUNCTION similar_locations(
  query_embedding vector(768),
  exclude_id text,
  match_count int DEFAULT 6,
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
  rating numeric,
  short_description text,
  tags text[],
  is_hidden_gem boolean,
  jta_approved boolean,
  is_unesco_site boolean,
  parent_id text,
  cuisine_type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id, l.name, l.city, l.region, l.category, l.place_id,
    l.image, l.rating, l.short_description, l.tags,
    l.is_hidden_gem, l.jta_approved, l.is_unesco_site,
    l.parent_id, l.cuisine_type,
    (1 - (l.embedding <=> query_embedding))::float AS similarity
  FROM locations l
  WHERE l.id != exclude_id
    AND l.is_active = true
    AND l.parent_id IS NULL
    AND l.embedding IS NOT NULL
    AND 1 - (l.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RPC function for semantic search
CREATE OR REPLACE FUNCTION semantic_search_locations(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.3,
  filter_region text DEFAULT NULL,
  filter_categories text[] DEFAULT NULL
)
RETURNS TABLE (
  id text,
  name text,
  city text,
  region text,
  category text,
  place_id text,
  image text,
  rating numeric,
  parent_id text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id, l.name, l.city, l.region, l.category, l.place_id,
    l.image, l.rating, l.parent_id,
    (1 - (l.embedding <=> query_embedding))::float AS similarity
  FROM locations l
  WHERE l.is_active = true
    AND l.parent_id IS NULL
    AND l.embedding IS NOT NULL
    AND 1 - (l.embedding <=> query_embedding) >= similarity_threshold
    AND (filter_region IS NULL OR l.region = filter_region)
    AND (filter_categories IS NULL OR l.category = ANY(filter_categories))
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
