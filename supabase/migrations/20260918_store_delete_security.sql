-- =====================================================================
-- MANUX — MIGRATION : SÉCURITÉ DE SUPPRESSION DES STORES & CLÉS API
-- Exécutable directement dans : Supabase SQL Editor (projet : juubntufqlogakwfvqwh)
-- =====================================================================

-- 1. Vérification et renforcement de la politique RLS DELETE sur la table stores
-- Cette politique garantit qu'un utilisateur authentifié ne peut supprimer 
-- que sa propre ligne de boutique et sa clé API secrète associée (auth.uid() = user_id).

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can delete their own store" ON public.stores;

-- Politique globale de gestion (SELECT, INSERT, UPDATE, DELETE) pour le propriétaire
CREATE POLICY "Users can manage their own stores"
  ON public.stores
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
