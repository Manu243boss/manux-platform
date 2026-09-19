-- =====================================================================
-- MANUX + CHARIOW — NOTIFICATIONS, COMMENTS, LIKES & DEEP SCORING
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'reply', 'view_milestone', 'welcome', 'subscription', 'system')),
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- 2. PRODUCT COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.product_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.product_comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_username TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  is_creator_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_comments_product ON public.product_comments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_parent ON public.product_comments(parent_id);

-- 3. VIDEO COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.video_comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_username TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  is_creator_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_comments_video ON public.video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_parent ON public.video_comments(parent_id);

-- 4. COMMENT LIKES (Prevent double voting)
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL,
  comment_type TEXT NOT NULL CHECK (comment_type IN ('product', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_comment_like UNIQUE (user_id, comment_id, comment_type)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes(comment_id);

-- 5. RECOMMENDATION & SCORING SYSTEM (Deep Scoring Heuristic)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recommendation_score NUMERIC(10, 2) DEFAULT 10.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_sales_clicks INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_rec_score ON public.profiles(recommendation_score DESC);

-- Function to calculate and update profile recommendation score dynamically
CREATE OR REPLACE FUNCTION public.update_profile_recommendation_score(target_profile_id UUID)
RETURNS VOID AS $$
DECLARE
  v_views INTEGER;
  v_clicks INTEGER;
  v_products_count INTEGER;
  v_videos_count INTEGER;
  v_subs_bonus NUMERIC;
  v_new_score NUMERIC;
BEGIN
  SELECT COALESCE(total_views, 0), COALESCE(total_sales_clicks, 0),
         CASE WHEN subscription_plan = 'pro' THEN 50 WHEN subscription_plan = 'creator' THEN 25 ELSE 5 END
  INTO v_views, v_clicks, v_subs_bonus
  FROM public.profiles
  WHERE id = target_profile_id;

  SELECT COUNT(*) INTO v_products_count FROM public.products WHERE creator_id = target_profile_id;
  SELECT COUNT(*) INTO v_videos_count FROM public.videos WHERE creator_id = target_profile_id;

  -- Deep Scoring Formula: (Views * 0.1) + (Clicks * 2.0) + (Products * 3.0) + (Videos * 4.0) + Plan Bonus
  v_new_score := 10.00 + (v_views * 0.1) + (v_clicks * 2.0) + (v_products_count * 3.0) + (v_videos_count * 4.0) + v_subs_bonus;

  UPDATE public.profiles
  SET recommendation_score = v_new_score,
      updated_at = NOW()
  WHERE id = target_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ENABLE RLS & POLICIES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public view product comments" ON public.product_comments;
CREATE POLICY "Public view product comments" ON public.product_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users insert product comments" ON public.product_comments;
CREATE POLICY "Authenticated users insert product comments" ON public.product_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public view video comments" ON public.video_comments;
CREATE POLICY "Public view video comments" ON public.video_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users insert video comments" ON public.video_comments;
CREATE POLICY "Authenticated users insert video comments" ON public.video_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public view comment likes" ON public.comment_likes;
CREATE POLICY "Public view comment likes" ON public.comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage comment likes" ON public.comment_likes;
CREATE POLICY "Users manage comment likes" ON public.comment_likes FOR ALL USING (auth.uid() = user_id);
