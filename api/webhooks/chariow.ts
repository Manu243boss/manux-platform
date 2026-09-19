import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://juubntufqlogakwfvqwh.supabase.co';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyb2xlIjoiYW5vbiJ9';

const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const CHARIOW_LICENSE_PRODUCTS = {
  creator: {
    id: 'prd_bqe0zdzi',
    name: 'ManuX Plan Créateur',
    price: 2.5,
    currency: 'USD',
  },
  pro: {
    id: 'prd_lsy7udh2',
    name: 'ManuX Plan Pro',
    price: 9.0,
    currency: 'USD',
  },
} as const;

export default async function handler(req: any, res: any) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-chariow-key, x-store-url, x-chariow-signature, Accept'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      message: 'Endpoint Webhook Chariow Pulse Vercel Serverless opérationnel.',
      supported_events: ['successful_sale', 'sale.completed', 'order.paid'],
      target_products: CHARIOW_LICENSE_PRODUCTS,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const payload = req.body || {};
    const signature = req.headers['x-chariow-signature'] as string | undefined;

    console.log('[CHARIOW WEBHOOK VERCEL] Received event payload:', {
      event: payload.event || payload.type || payload.event_type || 'pulse_event',
      has_signature: Boolean(signature),
      received_at: new Date().toISOString(),
    });

    const dataObj = payload.data || payload.sale || payload.order || payload;

    const saleId = String(
      payload.sale_id ||
        payload.order_id ||
        payload.id ||
        dataObj?.id ||
        dataObj?.sale_id ||
        dataObj?.order_id ||
        `sale_${Date.now()}`
    ).trim();

    const productId = String(
      payload.product_id ||
        dataObj?.product_id ||
        dataObj?.product?.id ||
        dataObj?.items?.[0]?.product_id ||
        payload.product?.id ||
        ''
    ).trim();

    const metadata =
      payload.custom_metadata ||
      dataObj?.custom_metadata ||
      payload.metadata ||
      dataObj?.metadata ||
      {};

    let targetUserId = String(
      metadata.manux_user_id ||
        payload.customer?.metadata?.manux_user_id ||
        payload.manux_user_id ||
        ''
    ).trim();

    const customerEmail = String(
      payload.customer?.email ||
        dataObj?.customer?.email ||
        payload.customer_email ||
        dataObj?.customer_email ||
        payload.email ||
        dataObj?.email ||
        ''
    ).trim().toLowerCase();

    const amount = Number(
      payload.amount ||
        dataObj?.amount ||
        payload.total ||
        dataObj?.total ||
        payload.price ||
        dataObj?.price ||
        0
    );

    const currency = String(
      payload.currency || dataObj?.currency || 'USD'
    ).toUpperCase();

    const licenseKey = String(
      payload.license_key ||
        dataObj?.license_key ||
        payload.license?.key ||
        dataObj?.license?.key ||
        payload.license?.code ||
        dataObj?.license?.code ||
        dataObj?.licenses?.[0]?.key ||
        dataObj?.licenses?.[0]?.code ||
        ''
    ).trim() || null;

    let mappedPlan: 'creator' | 'pro' | null = null;
    let planName = '';
    let expectedPrice = 0;

    if (productId === CHARIOW_LICENSE_PRODUCTS.creator.id) {
      mappedPlan = 'creator';
      planName = CHARIOW_LICENSE_PRODUCTS.creator.name;
      expectedPrice = CHARIOW_LICENSE_PRODUCTS.creator.price;
    } else if (productId === CHARIOW_LICENSE_PRODUCTS.pro.id) {
      mappedPlan = 'pro';
      planName = CHARIOW_LICENSE_PRODUCTS.pro.name;
      expectedPrice = CHARIOW_LICENSE_PRODUCTS.pro.price;
    } else {
      return res.status(200).json({
        received: true,
        activated: false,
        warning: 'UNRECOGNIZED_PRODUCT_ID',
        product_id: productId,
      });
    }

    if (!targetUserId) {
      return res.status(200).json({
        received: true,
        activated: false,
        warning: 'USER_NOT_FOUND',
        sale_id: saleId,
        customer_email: customerEmail,
      });
    }

    // Check user exists in profiles
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!profile) {
      return res.status(200).json({
        received: true,
        activated: false,
        error: 'USER_PROFILE_NOT_FOUND',
      });
    }

    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Appeler la fonction SECURITY DEFINER sécurisée de Supabase pour contourner les limitations de RLS
    const { data: dbResult, error: dbError } = await supabaseServer.rpc('handle_chariow_sale_success', {
      p_user_id: targetUserId,
      p_plan: mappedPlan,
      p_plan_name: planName,
      p_sale_id: saleId,
      p_product_id: productId,
      p_amount: amount || expectedPrice,
      p_currency: currency || 'USD',
      p_license_key: licenseKey,
      p_customer_email: customerEmail || null,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_payload: payload
    });

    if (dbError) {
      console.error('[CHARIOW WEBHOOK VERCEL DB ERROR]:', dbError);
      return res.status(500).json({
        error: 'DATABASE_UPDATE_FAILED',
        message: 'Impossible de mettre à jour l\'abonnement dans la base de données via RPC.',
        details: dbError
      });
    }

    return res.status(200).json({
      received: true,
      activated: dbResult?.activated ?? true,
      idempotent: dbResult?.idempotent ?? false,
      user_id: targetUserId,
      plan: mappedPlan,
      sale_id: saleId,
      license_key: licenseKey,
      expires_at: periodEnd,
      message: dbResult?.message || 'Abonnement traité avec succès.'
    });
  } catch (error: any) {
    console.error('[CHARIOW WEBHOOK VERCEL ERROR]:', error);
    return res.status(500).json({
      error: 'WEBHOOK_PROCESSING_FAILED',
      message: error?.message || 'Erreur lors du traitement du webhook.',
    });
  }
}
