-- =====================================================================
-- MANUX — MIGRATION : AJOUT DE LA CONTRAINTE UNIQUE SUR user_id DANS STORES
-- Permet de corriger l'erreur : "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Exécutable directement dans : Supabase SQL Editor (projet : juubntufqlogakwfvqwh)
-- =====================================================================

-- 1. S'il existe des doublons pour un même user_id dans stores, on garde le plus récent
DELETE FROM public.stores a USING public.stores b
WHERE a.user_id = b.user_id AND a.created_at < b.created_at;

-- 2. Ajout de la contrainte UNIQUE sur user_id pour permettre le .upsert({ onConflict: 'user_id' })
ALTER TABLE public.stores 
  ADD CONSTRAINT stores_user_id_key UNIQUE (user_id);

-- 3. Index de performance
CREATE INDEX IF NOT EXISTS idx_stores_user_id_unique ON public.stores(user_id);
