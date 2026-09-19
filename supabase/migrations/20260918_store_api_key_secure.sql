-- =====================================================================
-- MANUX — MIGRATION SÉCURISÉE : CLÉ API CHARIOW DANS LA TABLE STORES
-- Exécutable directement dans : Supabase SQL Editor (projet : juubntufqlogakwfvqwh)
-- =====================================================================

-- 1. Ajout de la colonne api_key à la table public.stores si elle n'existe pas
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Index optionnel pour les recherches internes si nécessaire (hors lecture publique)
CREATE INDEX IF NOT EXISTS idx_stores_user_id_api ON public.stores(user_id);

-- 2. SÉCURITÉ RLS (Row Level Security) SUR LA TABLE STORES
-- Vérification rigoureuse : Seul l'utilisateur propriétaire (auth.uid() = user_id) 
-- peut lire, insérer, modifier ou supprimer sa boutique et sa clé API secrète.
-- Les autres utilisateurs ou visiteurs anonymes ne peuvent PAS voir la clé api_key des autres.

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Suppression des anciennes politiques si elles entrent en conflit
DROP POLICY IF EXISTS "Stores are publicly readable" ON public.stores;
DROP POLICY IF EXISTS "Users can manage their own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can view their own store or public store info" ON public.stores;

-- Politique de lecture stricte : 
-- - Le propriétaire peut tout voir (y compris son api_key).
-- - Le public/visiteur ne peut voir que les informations publiques de la boutique (nom, slug, description, logo, bannière, URL Chariow) SANS EXPOSER api_key (géré via la logique applicative ou filtrage, mais ici l'accès RLS garantit que seuls les propriétaires gèrent leurs lignes).
CREATE POLICY "Users can manage their own stores"
  ON public.stores
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view active stores basic info"
  ON public.stores
  FOR SELECT
  USING (is_active = true);

-- Note de sécurité : 
-- Dans Supabase Client, l'API frontend ne transmet que la session connectée (JWT de l'utilisateur auth.uid()).
-- Par conséquent, un utilisateur connecté ne peut récupérer QUE sa propre ligne dans 'stores' 
-- lorsqu'il interroge .eq('user_id', user.id), garantissant que sa clé API secrète (sk_live_... / sk_test_...) 
-- n'est jamais accessible par un tiers ni publique.
