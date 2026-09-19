-- ====================================================================
-- ManuX — Migration 003 : Traçabilité Analytics Anonyme & Visibilité Publique
-- Exécutable directement dans : Supabase SQL Editor (projet : juubntufqlogakwfvqwh)
-- ====================================================================

-- 1. Table analytics_events : Autoriser l'enregistrement anonyme et authentifié
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can log analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Anon and authenticated can log analytics" ON public.analytics_events;

CREATE POLICY "Anon and authenticated can log analytics" 
  ON public.analytics_events 
  FOR INSERT 
  TO public, anon, authenticated
  WITH CHECK (true);

-- 2. Table products : Vérifier les colonnes et assurer la visibilité publique (anonyme et connectée)
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "Published products are publicly readable" ON public.products;
CREATE POLICY "Published products are publicly readable" 
  ON public.products 
  FOR SELECT 
  TO public, anon, authenticated
  USING (status = 'published' OR status IS NULL OR auth.uid() = user_id);

-- 3. Table videos : Assurer la visibilité publique
DROP POLICY IF EXISTS "Published videos are publicly readable" ON public.videos;
CREATE POLICY "Published videos are publicly readable" 
  ON public.videos 
  FOR SELECT 
  TO public, anon, authenticated
  USING (status = 'published' OR status IS NULL OR auth.uid() = user_id);

-- 4. Table profiles : Visibilité publique pour le flux d'accueil et les fiches créateurs
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
CREATE POLICY "Profiles are publicly readable" 
  ON public.profiles 
  FOR SELECT 
  TO public, anon, authenticated
  USING (true);
