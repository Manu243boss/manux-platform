-- ====================================================================
-- ManuX — Plateforme de Découverte et Démonstration Chariow
-- Migration 005 : Table product_comments pour commentaires sous les produits
-- Exécutable dans : Supabase SQL Editor (projet : juubntufqlogakwfvqwh)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.product_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.product_comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_username TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  is_creator_reply BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_comments_product_id ON public.product_comments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_parent_id ON public.product_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_created_at ON public.product_comments(created_at DESC);

-- RLS Policies
ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Les commentaires produits sont consultables publiquement" ON public.product_comments;
CREATE POLICY "Les commentaires produits sont consultables publiquement"
  ON public.product_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Tout le monde peut ajouter un commentaire produit" ON public.product_comments;
CREATE POLICY "Tout le monde peut ajouter un commentaire produit"
  ON public.product_comments FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "L'auteur peut modifier son commentaire produit" ON public.product_comments;
CREATE POLICY "L'auteur peut modifier son commentaire produit"
  ON public.product_comments FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);
