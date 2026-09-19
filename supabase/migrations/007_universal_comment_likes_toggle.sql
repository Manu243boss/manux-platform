-- =====================================================================
-- MANUX - UNIVERSAL COMMENT LIKES TOGGLE (RPC)
-- Exécutez ce script directement dans votre SQL Editor sur Supabase pour activer 
-- la gestion robuste des likes pour TOUS les commentaires (produits et vidéos) !
-- =====================================================================

CREATE OR REPLACE FUNCTION public.toggle_comment_like(comment_id UUID, is_unlike BOOLEAN)
RETURNS INT AS $$
DECLARE
  new_count INT := 0;
  is_video_comment BOOLEAN := FALSE;
  is_product_comment BOOLEAN := FALSE;
  step INT := 1;
BEGIN
  IF is_unlike THEN
    step := -1;
  END IF;

  -- 1. Vérifier si le commentaire existe dans video_comments
  SELECT EXISTS(SELECT 1 FROM public.video_comments WHERE id = comment_id) INTO is_video_comment;
  
  -- 2. Vérifier si le commentaire existe dans product_comments
  SELECT EXISTS(SELECT 1 FROM public.product_comments WHERE id = comment_id) INTO is_product_comment;

  IF is_video_comment THEN
    UPDATE public.video_comments
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) + step)
    WHERE id = comment_id
    RETURNING likes_count INTO new_count;
  ELSIF is_product_comment THEN
    UPDATE public.product_comments
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) + step)
    WHERE id = comment_id
    RETURNING likes_count INTO new_count;
  END IF;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que les likes_count de base ne soient jamais NULL
UPDATE public.video_comments SET likes_count = 0 WHERE likes_count IS NULL;
UPDATE public.product_comments SET likes_count = 0 WHERE likes_count IS NULL;
