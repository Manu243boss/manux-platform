-- =====================================================================
-- MANUX - MIGRATION SECURE WEBHOOKS VIA SECURITY DEFINER
-- Ce script résout définitivement les restrictions de RLS lors de
-- l'exécution des webhooks Chariow via l'Anon Key publique.
-- =====================================================================

-- 1. FONCTION : handle_chariow_sale_success
-- Traite l'activation et la mise à niveau de l'abonnement utilisateur en une seule transaction sécurisée.
CREATE OR REPLACE FUNCTION public.handle_chariow_sale_success(
  p_user_id UUID,
  p_plan TEXT,
  p_plan_name TEXT,
  p_sale_id TEXT,
  p_product_id TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_license_key TEXT,
  p_customer_email TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_existing_tx_id UUID;
BEGIN
  -- Éviter les doubles traitements (Idempotence)
  SELECT id INTO v_existing_tx_id 
  FROM public.payment_transactions 
  WHERE provider = 'chariow' AND provider_sale_id = p_sale_id 
  LIMIT 1;

  IF v_existing_tx_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Vente déjà traitée (idempotent)',
      'sale_id', p_sale_id
    );
  END IF;

  -- 1. Insertion dans public.payment_transactions
  INSERT INTO public.payment_transactions (
    user_id,
    provider,
    provider_sale_id,
    product_id,
    plan,
    amount,
    currency,
    status,
    customer_email,
    license_key,
    raw_payload,
    created_at,
    processed_at
  ) VALUES (
    p_user_id,
    'chariow',
    p_sale_id,
    p_product_id,
    p_plan::TEXT,
    p_amount,
    p_currency,
    'completed',
    p_customer_email,
    p_license_key,
    p_payload,
    p_period_start,
    p_period_start
  );

  -- 2. Insertion dans public.subscription_events
  INSERT INTO public.subscription_events (
    user_id,
    plan_id,
    amount_paid,
    currency,
    payment_provider,
    provider_reference,
    status,
    created_at
  ) VALUES (
    p_user_id,
    p_plan,
    p_amount,
    p_currency,
    'chariow',
    p_sale_id,
    'completed',
    p_period_start
  );

  -- 3. Mise à jour de la table public.profiles (Bénéficie du SECURITY DEFINER)
  UPDATE public.profiles
  SET
    subscription_plan = p_plan,
    subscription_status = 'active',
    subscription_name = p_plan_name,
    subscription_provider = 'chariow',
    subscription_started_at = p_period_start,
    subscription_expires_at = p_period_end,
    chariow_sale_id = p_sale_id,
    chariow_product_id = p_product_id,
    subscription_amount = p_amount,
    subscription_currency = p_currency,
    license_key = p_license_key,
    license_status = 'active',
    updated_at = p_period_start
  WHERE id = p_user_id;

  -- 4. Upsert dans public.subscriptions (Bénéficie du SECURITY DEFINER)
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    payment_provider,
    external_subscription_id,
    updated_at
  ) VALUES (
    p_user_id,
    p_plan,
    'active',
    p_period_start,
    p_period_end,
    'chariow',
    p_sale_id,
    p_period_start
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    payment_provider = EXCLUDED.payment_provider,
    external_subscription_id = EXCLUDED.external_subscription_id,
    updated_at = EXCLUDED.updated_at;

  RETURN json_build_object(
    'success', true,
    'idempotent', false,
    'message', 'Plan activé avec succès',
    'sale_id', p_sale_id,
    'user_id', p_user_id,
    'plan', p_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. FONCTION : handle_chariow_sale_abandoned
-- Enregistre l'abandon et déclasse ou maintient le profil au plan gratuit de façon sécurisée.
CREATE OR REPLACE FUNCTION public.handle_chariow_sale_abandoned(
  p_user_id UUID,
  p_plan TEXT,
  p_sale_id TEXT,
  p_product_id TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_license_key TEXT,
  p_customer_email TEXT,
  p_payload JSONB
)
RETURNS JSONB AS $$
BEGIN
  -- 1. Insertion de la transaction d'abandon
  INSERT INTO public.payment_transactions (
    user_id,
    provider,
    provider_sale_id,
    product_id,
    plan,
    amount,
    currency,
    status,
    customer_email,
    license_key,
    raw_payload,
    created_at,
    processed_at
  ) VALUES (
    p_user_id,
    'chariow',
    p_sale_id,
    p_product_id,
    p_plan::TEXT,
    p_amount,
    p_currency,
    'abandoned',
    p_customer_email,
    p_license_key,
    p_payload,
    NOW(),
    NOW()
  );

  -- 2. Mise à jour de public.profiles
  UPDATE public.profiles
  SET
    subscription_plan = 'free',
    subscription_status = 'abandoned',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 3. Upsert dans public.subscriptions
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    payment_provider,
    external_subscription_id,
    updated_at
  ) VALUES (
    p_user_id,
    'free',
    'abandoned',
    NOW(),
    NOW() + INTERVAL '30 days',
    'chariow',
    p_sale_id,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    payment_provider = EXCLUDED.payment_provider,
    external_subscription_id = EXCLUDED.external_subscription_id,
    updated_at = EXCLUDED.updated_at;

  RETURN json_build_object(
    'success', true,
    'message', 'Vente abandonnée enregistrée, profil configuré au plan gratuit',
    'sale_id', p_sale_id,
    'user_id', p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
