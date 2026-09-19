-- ====================================================================
-- ManuX — Plateforme de Découverte et Démonstration Chariow
-- Migration 001 : Schéma Initial, RLS, Politiques et Données de Référence
-- Exécutable directement dans : Supabase SQL Editor (projet : juubntufqlogakwfvqwh)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE : profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  country TEXT,
  city TEXT,
  language TEXT DEFAULT 'fr',
  profile_type TEXT DEFAULT 'Créateur',
  domain TEXT,
  primary_category TEXT,
  website_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'incomplete', 'published', 'suspended')),
  is_verified BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 3. TABLE : categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color_accent TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- 4. TABLE : plans (Tarification dynamique)
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  max_products INT NOT NULL DEFAULT 3,
  max_stores INT NOT NULL DEFAULT 1,
  can_have_video_demos BOOLEAN DEFAULT FALSE,
  can_have_verified_badge BOOLEAN DEFAULT FALSE,
  has_advanced_analytics BOOLEAN DEFAULT FALSE,
  has_priority_discovery BOOLEAN DEFAULT FALSE,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE : stores (Boutiques Chariow connectées)
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  external_chariow_url TEXT,
  chariow_store_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_connected BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);

-- 6. TABLE : products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  main_image_url TEXT,
  thumbnail_url TEXT,
  external_chariow_url TEXT,
  chariow_product_id TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- 7. TABLE : videos (Démonstrations YouTube)
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  is_unlisted_demo BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_slug ON public.videos(slug);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_product_id ON public.videos(product_id);

-- 8. TABLE : subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id) DEFAULT 'free',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  payment_provider TEXT,
  external_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);

-- 9. TABLE : analytics_events (Traçabilité réelle sans données inventées)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN ('product_view', 'product_click', 'creator_view', 'video_view', 'video_click', 'external_click', 'search', 'category_view')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_creator ON public.analytics_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at);

-- 10. RPC FUNCTION : incrémentation sécurisée des vues vidéos
CREATE OR REPLACE FUNCTION public.increment_video_views(vid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.videos
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = vid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles are publicly readable" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Categories Policies
CREATE POLICY "Categories are readable by everyone" 
  ON public.categories FOR SELECT 
  USING (true);

-- Plans Policies
CREATE POLICY "Plans are readable by everyone" 
  ON public.plans FOR SELECT 
  USING (true);

-- Stores Policies
CREATE POLICY "Stores are publicly readable" 
  ON public.stores FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage their own stores" 
  ON public.stores FOR ALL 
  USING (auth.uid() = user_id);

-- Products Policies
CREATE POLICY "Published products are publicly readable" 
  ON public.products FOR SELECT 
  USING (status = 'published' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own products" 
  ON public.products FOR ALL 
  USING (auth.uid() = user_id);

-- Videos Policies
CREATE POLICY "Published videos are publicly readable" 
  ON public.videos FOR SELECT 
  USING (status = 'published' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own videos" 
  ON public.videos FOR ALL 
  USING (auth.uid() = user_id);

-- Subscriptions Policies
CREATE POLICY "Users can read their own subscription" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

-- Analytics Events Policies
CREATE POLICY "Anyone can log analytics events" 
  ON public.analytics_events FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Creators can view their own analytics events" 
  ON public.analytics_events FOR SELECT 
  USING (auth.uid() = creator_id);

-- 12. SEED INITIAL DE RÉFÉRENCE (Catégories et Plans)
INSERT INTO public.categories (name, slug, description, display_order) VALUES
  ('Formations & Cours', 'formations-cours', 'Formations en ligne, masterclasses et ateliers vidéo', 1),
  ('Logiciels & Outils SaaS', 'logiciels-outils-saas', 'Applications web, scripts, plugins et solutions SaaS', 2),
  ('E-books & Guides', 'ebooks-guides', 'Livres numériques, guides pratiques et PDF téléchargeables', 3),
  ('Templates & Graphisme', 'templates-graphisme', 'Modèles Canva, Notion, Figma et identités graphiques', 4),
  ('Produits Physiques & Mode', 'produits-physiques-mode', 'Vêtements, accessoires, maroquinerie et objets confectionnés', 5),
  ('Coaching & Consultance', 'coaching-consultance', 'Séances de mentorat et accompagnement personnalisé', 6),
  ('Artisanat & Créations', 'artisanat-creations', 'Objets d''art, créations manuelles et artisanat d''exception', 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.plans (id, name, price_usd, max_products, max_stores, can_have_video_demos, can_have_verified_badge, has_advanced_analytics, has_priority_discovery, features) VALUES
  ('free', 'Plan Gratuit', 0, 3, 1, false, false, false, false, '["Création de profil public", "1 boutique Chariow connectée", "Jusqu’à 3 produits en vitrine", "Présence dans la recherche", "Statistiques de base"]'::jsonb),
  ('creator', 'Plan Créateur', 2.50, 20, 2, true, false, true, true, '["Jusqu’à 20 produits", "Jusqu’à 2 boutiques Chariow", "Démonstrations vidéo YouTube", "Analytics avancés des clics", "Mise en avant recommandation"]'::jsonb),
  ('pro', 'Plan Pro', 9.00, 100, 5, true, true, true, true, '["Jusqu’à 100 produits", "Boutiques illimitées", "Démonstrations vidéo avancées", "Badge vérifié (sous validation)", "Visibilité prioritaire"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
