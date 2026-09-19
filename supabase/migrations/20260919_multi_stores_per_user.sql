-- =====================================================================
-- MANUX — MIGRATION : SUPPORT MULTI-BOUTIQUES & MULTI-CLÉS API CHARIOW
-- Permet à chaque utilisateur de connecter plusieurs boutiques Chariow selon son forfait :
--   - Gratuit : 1 boutique / 1 clé API
--   - Créateur : jusqu'à 2 boutiques / 2 clés API
--   - Pro : jusqu'à 5 boutiques / 5 clés API
-- Exécutable directement dans : Supabase SQL Editor (projet : juubntufqlogakwfvqwh)
-- =====================================================================

-- 1. Suppression de la contrainte UNIQUE sur user_id dans public.stores si elle existe
-- afin de permettre l'enregistrement de plusieurs boutiques distinctes pour un même créateur
ALTER TABLE public.stores 
  DROP CONSTRAINT IF EXISTS stores_user_id_key;

-- 2. S'assurer que la colonne api_key existe
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS api_key TEXT;

-- 3. S'assurer que is_active et is_connected existent
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT FALSE;

-- 4. Index de performance pour charger toutes les boutiques d'un créateur
CREATE INDEX IF NOT EXISTS idx_stores_user_created ON public.stores(user_id, created_at DESC);

-- 5. Vérification des Politiques de Sécurité RLS (Row Level Security)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own stores" ON public.stores;
CREATE POLICY "Users can manage their own stores"
  ON public.stores
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view active stores basic info" ON public.stores;
CREATE POLICY "Public can view active stores basic info"
  ON public.stores
  FOR SELECT
  USING (is_active = true);

-- Confirmation de validation
COMMENT ON TABLE public.stores IS 'Boutiques Chariow et clés API connectées par les créateurs ManuX (support multi-boutiques).';
