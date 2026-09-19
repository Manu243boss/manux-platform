-- ====================================================================
-- ManuX — Plateforme de Découverte et Démonstration Chariow
-- Migration 002 : Commentaires Style TikTok, Préférences Devises, & Stockage WebP
-- Exécutable directement dans : Supabase SQL Editor (projet : juubntufqlogakwfvqwh)
-- ====================================================================

-- 1. MISE À JOUR DE LA TABLE PROFILES
-- Ajout de la devise préférée et des coordonnées
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'CDF',
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_currency ON public.profiles(preferred_currency);

-- 2. TABLE : video_comments (Commentaires interactifs style TikTok avec réponses)
CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.video_comments(id) ON DELETE CASCADE, -- Pour les réponses imbriquées
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

CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_parent_id ON public.video_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_created_at ON public.video_comments(created_at DESC);

-- 3. FONCTION RPC : Incrémentation atomique des likes de commentaire
CREATE OR REPLACE FUNCTION public.increment_comment_likes(comment_id UUID)
RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE public.video_comments
  SET likes_count = COALESCE(likes_count, 0) + 1
  WHERE id = comment_id
  RETURNING likes_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. POLITIQUES RLS POUR LES COMMENTAIRES
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- Lecture publique de tous les commentaires
CREATE POLICY "Les commentaires sont consultables publiquement"
  ON public.video_comments FOR SELECT
  USING (true);

-- Insertion de commentaire pour tout utilisateur (anonyme ou connecté)
CREATE POLICY "Tout le monde peut ajouter un commentaire"
  ON public.video_comments FOR INSERT
  WITH CHECK (true);

-- Mise à jour autorisée pour l'auteur ou le créateur
CREATE POLICY "L'auteur peut modifier son commentaire"
  ON public.video_comments FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- 5. CONFIGURATION DU STORAGE BUCKET AVATARS & PRODUITS (Stockage WebP)
-- Crée les buckets s'ils n'existent pas encore
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('products', 'products', true),
  ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques de lecture publique pour le storage
CREATE POLICY "Accès public aux avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Accès public aux images produits"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "Accès public aux miniatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

-- Politiques d'upload pour les utilisateurs authentifiés
CREATE POLICY "Upload autorisé dans avatars pour utilisateurs connectés"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Upload autorisé dans products pour utilisateurs connectés"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Upload autorisé dans thumbnails pour utilisateurs connectés"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails' AND auth.role() = 'authenticated');
