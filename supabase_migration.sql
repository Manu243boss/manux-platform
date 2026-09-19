-- =====================================================================
-- MANUX - SCRIPT DE MIGRATION & SCHÉMA ULTRA-ROBUSTE ET IDEMPOTENT
-- Ajout automatique de toutes les colonnes manquantes (ADD COLUMN IF NOT EXISTS)
-- sur TOUTES les tables existantes avant les insertions.
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================================
-- 2. TABLE PROFILES & TOUTES SES COLONNES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Côte d’Ivoire';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'XOF';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Français';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'Créateur';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_name TEXT DEFAULT 'Plan Gratuit';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_provider TEXT DEFAULT 'chariow';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chariow_sale_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chariow_product_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_currency TEXT DEFAULT 'USD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires ON public.profiles(subscription_expires_at);

-- =====================================================================
-- 3. TABLE CATEGORIES & TOUTES SES COLONNES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajout de toutes les colonnes requises si la table existait déjà
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#f59e0b';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Insertion sécurisée des catégories
INSERT INTO public.categories (name, slug, description, icon, color, display_order)
VALUES
  ('Formations & Coaching', 'formations-coaching', 'Formations en ligne, masterclasses et accompagnements.', 'GraduationCap', '#f59e0b', 1),
  ('Logiciels & SaaS', 'logiciels-saas', 'Applications web, outils d’automatisation et logiciels.', 'Laptop', '#3b82f6', 2),
  ('E-books & Guides', 'ebooks-guides', 'Livres numériques, guides pratiques et PDF téléchargeables.', 'BookOpen', '#10b981', 3),
  ('Templates & Outils', 'templates-outils', 'Modèles Canva, Notion, Excel, Figma et fiches pratiques.', 'Layout', '#8b5cf6', 4),
  ('Services Freelance', 'services-freelance', 'Prestations graphiques, développement, rédaction et consulting.', 'Briefcase', '#ec4899', 5),
  ('Produits Physiques', 'produits-physiques', 'Articles physiques vendus via les boutiques Chariow.', 'Package', '#f97316', 6),
  ('Événements & Billetterie', 'evenements-billetterie', 'Billets de conférences, séminaires et webinaires.', 'Ticket', '#06b6d4', 7)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order;

-- =====================================================================
-- 4. TABLE PLANS D'ABONNEMENT (plans)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_products INT DEFAULT 3;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_stores INT DEFAULT 1;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS can_have_video_demos BOOLEAN DEFAULT FALSE;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS can_have_verified_badge BOOLEAN DEFAULT FALSE;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS has_advanced_analytics BOOLEAN DEFAULT FALSE;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS has_priority_discovery BOOLEAN DEFAULT FALSE;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- Insertion et mise à jour des forfaits officiels
INSERT INTO public.plans (id, name, price_usd, max_products, max_stores, can_have_video_demos, can_have_verified_badge, has_advanced_analytics, has_priority_discovery, features)
VALUES 
  ('free', 'Plan Gratuit', 0.00, 3, 1, false, false, false, false, '["Création de profil public", "1 boutique Chariow connectée", "Jusqu’à 3 produits en vitrine", "Présence dans la recherche globale", "Statistiques de base (vues & clics)"]'::jsonb),
  ('creator', 'Plan Créateur', 2.50, 20, 2, true, false, true, true, '["Jusqu’à 20 produits en vitrine", "Jusqu’à 2 boutiques Chariow", "Démonstrations vidéo YouTube incluses", "Statistiques avancées des clics Chariow", "Mise en avant dans les recommandations", "Badge Créateur et liens sociaux multiples"]'::jsonb),
  ('pro', 'Plan Pro', 9.00, 100, 10, true, true, true, true, '["Produits illimités (jusqu’à 100)", "Boutiques multiples (jusqu’à 10)", "Vidéos de démonstration prioritaires", "Badge de vitrine Vérifié / Pro", "Changement libre de miniatures vidéo", "Support créateur dédié 7j/7"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_usd = EXCLUDED.price_usd,
  max_products = EXCLUDED.max_products,
  max_stores = EXCLUDED.max_stores,
  can_have_video_demos = EXCLUDED.can_have_video_demos,
  can_have_verified_badge = EXCLUDED.can_have_verified_badge,
  has_advanced_analytics = EXCLUDED.has_advanced_analytics,
  has_priority_discovery = EXCLUDED.has_priority_discovery,
  features = EXCLUDED.features;

-- =====================================================================
-- 5. TABLE BOUTIQUES CHARIOW (stores)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  external_chariow_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banner_url TEXT;

CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);

-- =====================================================================
-- 6. TABLE PRODUITS (products)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  external_chariow_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'XOF';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS main_image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS clicks_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- =====================================================================
-- 7. TABLE VIDÉOS YOUTUBE (videos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS custom_thumbnail_url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';

CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_product_id ON public.videos(product_id);
CREATE INDEX IF NOT EXISTS idx_videos_slug ON public.videos(slug);

-- =====================================================================
-- 8. TABLE ANALYTICS EVENTS (analytics_events)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_creator ON public.analytics_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- =====================================================================
-- 9. TABLE SUBSCRIPTIONS & SUBSCRIPTION EVENTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  payment_provider TEXT,
  provider_reference TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 9B. TABLE PAYMENT TRANSACTIONS (IDEMPOTENCE ET TRAÇABILITÉ CHARIOW)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'chariow',
  provider_sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'creator', 'pro')),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'completed',
  customer_email TEXT,
  license_key TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_payment_transactions_provider_sale UNIQUE (provider, provider_sale_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_sale_id ON public.payment_transactions(provider_sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_product_id ON public.payment_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_license_key ON public.payment_transactions(license_key);

-- =====================================================================
-- 10. TABLE SOCIAL LINKS (profile_social_links)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profile_social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 11. TABLE SIGNALEMENTS (reports)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- =====================================================================
-- 12. TRIGGER DE CRÉATION AUTOMATIQUE DU PROFIL
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  clean_username TEXT;
BEGIN
  base_username := SPLIT_PART(NEW.email, '@', 1);
  clean_username := LOWER(REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  
  IF clean_username = '' THEN
    clean_username := 'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 6);
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = clean_username) THEN
    clean_username := clean_username || '_' || SUBSTRING(NEW.id::text FROM 1 FOR 4);
  END IF;

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    full_name,
    avatar_url,
    subscription_plan,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    clean_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', base_username),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'free',
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    subscription_plan = COALESCE(public.profiles.subscription_plan, 'free');

  INSERT INTO public.subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 13. ACTIVATION RLS SUR TOUTES LES TABLES
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 14. POLITIQUES RLS
-- =====================================================================

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Plans & Categories
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

-- Stores
DROP POLICY IF EXISTS "Stores are viewable by everyone" ON public.stores;
CREATE POLICY "Stores are viewable by everyone" ON public.stores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own stores" ON public.stores;
CREATE POLICY "Users can manage their own stores" ON public.stores FOR ALL USING (auth.uid() = user_id);

-- Products
DROP POLICY IF EXISTS "Published products are viewable by everyone" ON public.products;
CREATE POLICY "Published products are viewable by everyone" ON public.products FOR SELECT USING (status = 'published' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own products" ON public.products;
CREATE POLICY "Users can manage their own products" ON public.products FOR ALL USING (auth.uid() = user_id);

-- Videos
DROP POLICY IF EXISTS "Published videos are viewable by everyone" ON public.videos;
CREATE POLICY "Published videos are viewable by everyone" ON public.videos FOR SELECT USING (status = 'published' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own videos" ON public.videos;
CREATE POLICY "Users can manage their own videos" ON public.videos FOR ALL USING (auth.uid() = user_id);

-- Analytics
DROP POLICY IF EXISTS "Anyone can record analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can record analytics events" ON public.analytics_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Creators can view their own analytics" ON public.analytics_events;
CREATE POLICY "Creators can view their own analytics" ON public.analytics_events FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = user_id);

-- Subscriptions & Subscription Events
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own subscription events" ON public.subscription_events;
CREATE POLICY "Users can view their own subscription events" ON public.subscription_events FOR SELECT USING (auth.uid() = user_id);

-- Payment Transactions
DROP POLICY IF EXISTS "Users can view their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view their own payment transactions" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id);

-- Social Links
DROP POLICY IF EXISTS "Social links are viewable by everyone" ON public.profile_social_links;
CREATE POLICY "Social links are viewable by everyone" ON public.profile_social_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their social links" ON public.profile_social_links;
CREATE POLICY "Users can manage their social links" ON public.profile_social_links FOR ALL USING (auth.uid() = profile_id);

-- Reports
DROP POLICY IF EXISTS "Users can submit reports" ON public.reports;
CREATE POLICY "Users can submit reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_user_id OR reporter_user_id IS NULL);

-- =====================================================================
-- 15. BUCKETS SUPABASE STORAGE (Avatars, Banners, Products)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('thumbnails', 'thumbnails', true),
  ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public Access Banners" ON storage.objects;
CREATE POLICY "Public Access Banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Public Access Thumbnails" ON storage.objects;
CREATE POLICY "Public Access Thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "Public Access Products" ON storage.objects;
CREATE POLICY "Public Access Products" ON storage.objects FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can upload banners" ON storage.objects;
CREATE POLICY "Authenticated users can upload banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can upload thumbnails" ON storage.objects;
CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'thumbnails' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- =====================================================================
-- 16. FONCTION DE CONTRÔLE AUTOMATIQUE DES EXPIRATIONS (CYCLE 30 JOURS)
-- Déclassement automatique vers 'free' à l'expiration
-- =====================================================================
CREATE OR REPLACE FUNCTION public.check_subscription_expirations()
RETURNS INTEGER AS $$
DECLARE
  downgraded_count INTEGER := 0;
BEGIN
  WITH expired_users AS (
    UPDATE public.profiles
    SET
      subscription_plan = 'free',
      subscription_status = 'expired',
      subscription_name = 'Plan Gratuit',
      updated_at = NOW()
    WHERE
      subscription_expires_at IS NOT NULL
      AND subscription_expires_at < NOW()
      AND subscription_plan IN ('creator', 'pro')
    RETURNING id
  )
  SELECT COUNT(*) INTO downgraded_count FROM expired_users;

  UPDATE public.subscriptions
  SET
    plan_id = 'free',
    status = 'expired',
    updated_at = NOW()
  WHERE
    current_period_end IS NOT NULL
    AND current_period_end < NOW()
    AND plan_id IN ('creator', 'pro');

  RETURN downgraded_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

