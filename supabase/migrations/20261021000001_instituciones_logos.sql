ALTER TABLE instituciones
  ADD COLUMN IF NOT EXISTS logo_cuadrado_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_rectangular_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'institution-logos',
  'institution-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'institution_logos_public_read'
  ) THEN
    CREATE POLICY "institution_logos_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'institution-logos');
  END IF;
END $$;
