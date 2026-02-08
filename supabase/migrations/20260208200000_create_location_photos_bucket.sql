-- Create a public storage bucket for location photos.
-- Photos are downloaded from Google Places once and served from here permanently.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'location-photos',
  'location-photos',
  true,
  5242880,  -- 5MB max per photo
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (photos are not sensitive)
CREATE POLICY "Public read access for location photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'location-photos');

-- Allow service role to upload (used by enrichment scripts)
CREATE POLICY "Service role upload for location photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'location-photos');
