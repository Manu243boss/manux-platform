-- =====================================================================
-- MANUX - MIGRATION PAIEMENTS & ABONNEMENTS CHARIOW (OFFICIAL LICENSES)
-- Produits Chariow configurés :
-- - Plan Créateur ($2.50 USD) : prd_bqe0zdzi
-- - Plan Pro ($9.00 USD)      : prd_lsy7udh2
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. MISE À JOUR DE LA TABLE PROFILES
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

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON public.profiles(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires ON public.profiles(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_license_key ON public.profiles(license_key);

-- 3. TABLE PAYMENT TRANSACTIONS (HISTORIQUE DES TRANSACTIONS ET VENTES CHARIOW)
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
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at);

-- 4. TABLE SUBSCRIPTIONS (SYNCHRONISATION ET CYCLE 30 JOURS)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  payment_provider TEXT DEFAULT 'chariow',
  external_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 6. FONCTION DE CONTRÔLE AUTOMATIQUE DES EXPIRATIONS (CYCLE DE 30 JOURS)
-- Déclassement automatique vers 'free' à l'expiration (0 jour restant)
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
