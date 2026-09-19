-- =====================================================================
-- MANUX - SQL FIX POUR LE WEBHOOK CHARIOW & LES POLITIQUES DE SÉCURITÉ (RLS)
-- Exécutez ce script directement dans votre SQL Editor sur Supabase !
-- =====================================================================

-- 1. FIX DU DOUBLE ENREGISTREMENT & DE L'UPSERT SUR SUBSCRIPTIONS
-- Si plusieurs abonnements existent déjà pour le même utilisateur, nous gardons uniquement le plus récent
DELETE FROM public.subscriptions a USING public.subscriptions b
WHERE a.created_at < b.created_at AND a.user_id = b.user_id;

-- Ajout de la contrainte UNIQUE sur user_id si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_subscriptions_user_id' OR conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT uq_subscriptions_user_id UNIQUE (user_id);
  END IF;
END $$;


-- 2. ACTIVATION DES RLS ET CRÉATION DES POLITIQUES DE SAUVEGARDE POUR LE WEBHOOK
-- Le webhook s'exécute côté serveur. Pour autoriser l'écriture sécurisée des transactions, des événements et de l'abonnement :

-- Table : payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for webhooks" ON public.payment_transactions;
CREATE POLICY "Enable insert for webhooks"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');


-- Table : subscription_events
-- Création de la table si jamais elle n'existait pas sur certains environnements
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_provider TEXT DEFAULT 'chariow',
  provider_reference TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for webhooks" ON public.subscription_events;
CREATE POLICY "Enable insert for webhooks"
  ON public.subscription_events
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own subscription events" ON public.subscription_events;
CREATE POLICY "Users can view their own subscription events"
  ON public.subscription_events
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');


-- Table : subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert/update for webhooks" ON public.subscriptions;
CREATE POLICY "Enable insert/update for webhooks"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for webhooks" ON public.subscriptions;
CREATE POLICY "Enable update for webhooks"
  ON public.subscriptions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');
