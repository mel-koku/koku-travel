-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS embedding vector(768);

-- HNSW index for fast cosine similarity search
-- ~5,874 rows is trivial for HNSW; better recall than IVFFlat without tuning
CREATE INDEX IF NOT EXISTS idx_locations_embedding
  ON locations USING hnsw (embedding vector_cosine_ops);

-- Comment for documentation
COMMENT ON COLUMN locations.embedding IS 'text-embedding-005 vector (768d) of composite location text';
