-- ====================================================================
-- ManuX — Migration 004 : Deuxième Image Produit, Storage WebP & Analytics
-- Exécutable directement dans : Supabase SQL Editor (projet : juubntufqlogakwfvqwh)
-- ====================================================================

-- 1. Ajouter la colonne secondary_image_url à la table products
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS secondary_image_url TEXT;

-- 2. Création et configuration du Bucket Supabase Storage 'product-images'
-- Note : Ceci garantit que le bucket est public pour la lecture de photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10 Mo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/jpg'];

-- 3. Politiques RLS de Supabase Storage pour le bucket 'product-images'
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  TO public, anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Users can update their own product images" ON storage.objects;
CREATE POLICY "Users can update their own product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own product images" ON storage.objects;
CREATE POLICY "Users can delete their own product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- 4. Analytics : Garantir l'enregistrement des vues anonymes & publiques
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon and authenticated can log analytics" ON public.analytics_events;
CREATE POLICY "Anon and authenticated can log analytics" 
  ON public.analytics_events 
  FOR INSERT 
  TO public, anon, authenticated
  WITH CHECK (true);

-- 5. Fonction d'incrémentation directe si nécessaire pour les vues produits
CREATE OR REPLACE FUNCTION public.increment_product_views(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.analytics_events (event_type, product_id, session_id, created_at)
  VALUES ('product_view', p_id, 'session_' || gen_random_uuid(), NOW());
END;
$$;
