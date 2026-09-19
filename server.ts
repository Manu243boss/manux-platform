import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;
const apiRouter = express.Router();

// Enable CORS for API routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-chariow-key, x-store-url, x-chariow-signature, Accept'
  );
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// -------------------------------------------------------------
// SUPABASE SERVER-SIDE CLIENT
// -------------------------------------------------------------
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://juubntufqlogakwfvqwh.supabase.co';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyb2xlIjoiYW5vbiJ9';

export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// -------------------------------------------------------------
// OFFICIAL CHARIOW LICENSE PRODUCTS SPECIFICATION
// -------------------------------------------------------------
export const CHARIOW_LICENSE_PRODUCTS = {
  creator: {
    id: 'prd_bqe0zdzi',
    name: 'ManuX Plan Créateur',
    price: 2.5,
    currency: 'USD',
    url: 'https://manux.mychariow.com/prd_bqe0zdzi',
  },
  pro: {
    id: 'prd_lsy7udh2',
    name: 'ManuX Plan Pro',
    price: 9.0,
    currency: 'USD',
    url: 'https://manux.mychariow.com/prd_lsy7udh2',
  },
} as const;

// In-memory cache for Chariow API requests (TTL: 5 minutes)
interface ServerCacheItem<T> {
  data: T;
  timestamp: number;
}
const serverCache = new Map<string, ServerCacheItem<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const item = serverCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    serverCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCached<T>(key: string, data: T): void {
  serverCache.set(key, { data, timestamp: Date.now() });
}

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ManuX API Proxy',
  });
});

// -------------------------------------------------------------
// CHARIOW OFFICIAL API PROXY
// Docs: https://chariow.dev/
// Base URL: https://api.chariow.com/v1
// -------------------------------------------------------------

/**
 * Normalizes Chariow product picture priority:
 * 1. pictures.cover
 * 2. pictures.thumbnail
 * 3. Fallback placeholder
 */
function normalizeChariowProduct(raw: any, storeUrl?: string) {
  const pictures = raw.pictures || {};
  const cover = pictures.cover || raw.cover || raw.image_url || raw.main_image_url || (Array.isArray(raw.images) ? raw.images[0] : null) || null;
  const thumbnail = pictures.thumbnail || raw.thumbnail || cover || null;
  const displayImage = cover || thumbnail || null;

  const cleanStoreUrl = storeUrl ? storeUrl.trim().replace(/\/+$/, '') : '';
  const productId = String(raw.id || raw.product_id || '');

  // Formats product URL according to the seller's Chariow store URL (e.g., https://chariow.com/store/maboutique/prd_123)
  const storeBasedUrl = cleanStoreUrl && productId ? `${cleanStoreUrl}/${productId}` : '';
  const finalUrl = storeBasedUrl || raw.url || raw.checkout_url || raw.permalink || (productId ? `https://chariow.com/p/${productId}` : '');

  return {
    id: productId,
    name: raw.name || raw.title || raw.product_name || 'Produit Chariow',
    description: raw.description || raw.short_description || '',
    price: typeof raw.price === 'number' ? raw.price : parseFloat(raw.price) || 0,
    currency: raw.currency || 'USD',
    pictures: {
      cover: cover,
      thumbnail: thumbnail,
    },
    display_image: displayImage,
    url: finalUrl,
    checkout_url: finalUrl,
    status: raw.status || 'published',
    created_at: raw.created_at || new Date().toISOString(),
  };
}

/**
 * GET /api/chariow/products
 * Proxies GET https://api.chariow.com/v1/products with authentication and cache
 */
apiRouter.get('/chariow/products', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const cursor = req.query.cursor ? String(req.query.cursor) : '';
    const customKey = req.headers['x-chariow-key'] as string | undefined;
    const storeUrlHeader = (req.headers['x-store-url'] as string | undefined) || (req.query.store_url as string | undefined);

    // Use creator store key or server environment secret
    const apiKey = (customKey || process.env.CHARIOW_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(200).json({
        data: [],
        has_more: false,
        warning: 'CHARIOW_API_KEY_NOT_CONFIGURED',
        message: 'Aucune clé API Chariow renseignée pour cette boutique.',
      });
    }

    const cacheKey = `products_${apiKey.slice(-6)}_${limit}_${cursor}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const queryParams = new URLSearchParams();
    if (limit) queryParams.set('limit', String(limit));
    if (cursor) queryParams.set('cursor', cursor);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const candidatePaths = [
      `https://api.chariow.com/v1/products${queryString}`,
      `https://api.chariow.com/v1/stores/me/products${queryString}`,
      `https://api.chariow.com/v1/store/products${queryString}`,
      `https://api.chariow.com/v1/merchant/products${queryString}`,
      `https://api.chariow.com/v1/me/products${queryString}`,
    ];

    if (storeUrlHeader) {
      try {
        const parsedUrl = new URL(storeUrlHeader);
        const hostParts = parsedUrl.hostname.split('.');
        if (hostParts.length > 2 && hostParts[0] !== 'www') {
          const sub = hostParts[0];
          candidatePaths.push(`https://api.chariow.com/v1/stores/${sub}/products${queryString}`);
        }
        const pathname = parsedUrl.pathname.replace(/^\/store\//, '').replace(/^\//, '');
        if (pathname) {
          candidatePaths.push(`https://api.chariow.com/v1/stores/${pathname}/products${queryString}`);
        }
      } catch (e) {
        // ignore url parsing error
      }
    }

    let fetchResponse: any = null;
    let json: any = null;

    for (const targetUrl of candidatePaths) {
      try {
        const fetchRes = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'User-Agent': 'ManuX-Proxy/1.0',
          },
        });

        if (fetchRes.status === 401) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Clé API Chariow non valide ou révoquée.',
          });
        }

        if (fetchRes.status === 429) {
          return res.status(429).json({
            error: 'RATE_LIMITED',
            message: 'Limite de requêtes Chariow atteinte (100 req/min). Veuillez patienter.',
          });
        }

        if (fetchRes.ok) {
          fetchResponse = fetchRes;
          json = await fetchRes.json();
          break;
        }
      } catch (e) {
        // try next endpoint
      }
    }

    if (!fetchResponse || !fetchResponse.ok || !json) {
      // Return clean empty dataset when Chariow returns 404 or store is newly created (No mock data)
      return res.status(200).json({
        data: [],
        has_more: false,
        message: 'Aucun produit trouvé sur votre boutique Chariow ou catalogue vide.',
      });
    }

    const rawList = Array.isArray(json) ? json : json?.data || json?.products || json?.items || [];
    const normalized = rawList.map((item: any) => normalizeChariowProduct(item, storeUrlHeader));

    const result = {
      data: normalized,
      has_more: Boolean(json.has_more ?? (json.pagination && json.pagination.has_more)),
      next_cursor: json.next_cursor || json.pagination?.next_cursor || null,
    };

    setCached(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error('[ManuX Server Proxy] Error fetching Chariow products:', error);
    return res.status(500).json({
      error: 'SERVER_PROXY_ERROR',
      message: error?.message || 'Erreur interne lors de la requête Chariow.',
    });
  }
});

/**
 * GET /api/chariow/products/:productId
 * Proxies GET https://api.chariow.com/v1/products/{productId}
 */
apiRouter.get('/chariow/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const customKey = req.headers['x-chariow-key'] as string | undefined;
    const apiKey = (customKey || process.env.CHARIOW_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(200).json({
        data: null,
        warning: 'CHARIOW_API_KEY_NOT_CONFIGURED',
      });
    }

    const cacheKey = `product_${productId}_${apiKey.slice(-6)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const targetUrl = `https://api.chariow.com/v1/products/${productId}`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Clé Chariow non valide.' });
    }

    if (response.status === 404) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Produit Chariow introuvable.' });
    }

    if (response.status === 429) {
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Trop de requêtes Chariow.' });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: 'API_ERROR' });
    }

    const json = await response.json();
    const rawData = json?.data || json;
    const normalized = normalizeChariowProduct(rawData);

    setCached(cacheKey, { data: normalized });
    return res.json({ data: normalized });
  } catch (error: any) {
    console.error('[ManuX Server Proxy] Error fetching single Chariow product:', error);
    return res.status(500).json({ error: 'SERVER_PROXY_ERROR', message: error?.message });
  }
});

// -------------------------------------------------------------
// 1. CHARIOW CHECKOUT ENDPOINT
// POST /api/payments/chariow/checkout
// Maps plan -> Product ID & Generates verified checkout URL
// -------------------------------------------------------------
apiRouter.post('/payments/chariow/checkout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentification requise pour initier un paiement.',
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Session utilisateur invalide ou expirée.',
      });
    }

    const { plan } = req.body || {};
    if (plan !== 'creator' && plan !== 'pro') {
      return res.status(400).json({
        error: 'INVALID_PLAN',
        message: 'Plan invalide. Veuillez choisir "creator" ou "pro".',
      });
    }

    const targetProduct = CHARIOW_LICENSE_PRODUCTS[plan];
    const productId = targetProduct.id;

    // Fetch user profile from Supabase
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('id, full_name, display_name, username, email, phone')
      .eq('id', user.id)
      .maybeSingle();

    const userName =
      profile?.display_name ||
      profile?.full_name ||
      profile?.username ||
      'Créateur ManuX';
    const userEmail = user.email || profile?.email || 'contact@manux.app';

    // Parse name into first_name and last_name for Chariow API requirements
    const nameParts = userName.trim().split(/\s+/);
    const firstName = req.body?.first_name || (profile as any)?.first_name || nameParts[0] || 'Créateur';
    const lastName = req.body?.last_name || (profile as any)?.last_name || nameParts.slice(1).join(' ') || 'ManuX';

    // Parse phone into country_code and number for Chariow API requirements
    const rawPhone = req.body?.phone || profile?.phone;
    let phoneObj = { country_code: '+243', number: '800000000' };
    if (typeof rawPhone === 'object' && rawPhone?.number && rawPhone?.country_code) {
      phoneObj = { country_code: String(rawPhone.country_code), number: String(rawPhone.number) };
    } else if (typeof rawPhone === 'string' && rawPhone.trim()) {
      const cleanPhone = rawPhone.trim();
      if (cleanPhone.startsWith('+')) {
        const spaceIdx = cleanPhone.indexOf(' ');
        if (spaceIdx > 0) {
          phoneObj = { country_code: cleanPhone.slice(0, spaceIdx), number: cleanPhone.slice(spaceIdx + 1).replace(/\D/g, '') || '800000000' };
        } else {
          phoneObj = { country_code: cleanPhone.slice(0, 4), number: cleanPhone.slice(4).replace(/\D/g, '') || '800000000' };
        }
      } else {
        phoneObj = { country_code: '+243', number: cleanPhone.replace(/\D/g, '') || '800000000' };
      }
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host =
      req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    const appOrigin = process.env.APP_URL || `${protocol}://${host}`;

    const redirectUrl = `${appOrigin}/dashboard/subscription?status=verifying&plan=${plan}`;
    const cancelUrl = `${appOrigin}/pricing`;

    const apiKey = (process.env.CHARIOW_API_KEY || process.env.VITE_CHARIOW_API_KEY || '').trim();
    let checkoutUrl = '';

    console.log(
      `[CHARIOW CHECKOUT] Creating checkout session for user ${user.id} (${userEmail}) -> Plan: ${plan} (Product: ${productId})`
    );

    // If a server-side Chariow API key is configured, call official Chariow API
    if (apiKey) {
      try {
        const chariowPayload = {
          product_id: productId,
          email: userEmail,
          first_name: firstName,
          last_name: lastName,
          phone: phoneObj,
          customer: {
            email: userEmail,
            name: `${firstName} ${lastName}`.trim(),
            first_name: firstName,
            last_name: lastName,
            phone: phoneObj,
          },
          custom_metadata: {
            manux_user_id: user.id,
            manux_plan: plan,
          },
          metadata: {
            manux_user_id: user.id,
            manux_plan: plan,
          },
          redirect_url: redirectUrl,
          cancel_url: cancelUrl,
        };

        const response = await fetch('https://api.chariow.com/v1/checkout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'ManuX-Platform/1.0',
          },
          body: JSON.stringify(chariowPayload),
        });

        if (response.ok) {
          const json = await response.json();
          checkoutUrl =
            json?.checkout_url ||
            json?.url ||
            json?.data?.checkout_url ||
            json?.data?.url ||
            '';
        } else {
          const errText = await response.text();
          console.info(
            `[CHARIOW CHECKOUT] API checkout endpoint status ${response.status} (${errText.slice(0, 120)}...).`
          );
        }
      } catch (apiErr) {
        console.error('[CHARIOW CHECKOUT] Error calling Chariow Checkout API:', apiErr);
      }
    }

    // Direct checkout URL formatting (send buyer directly to checkout action with prefilled customer data)
    if (!checkoutUrl) {
      const params = new URLSearchParams();
      if (userEmail) {
        params.set('email', userEmail);
        params.set('customer_email', userEmail);
        params.set('email_address', userEmail);
        params.set('customer[email]', userEmail);
      }
      if (userName) {
        params.set('name', userName);
        params.set('customer_name', userName);
        params.set('customer[name]', userName);
        if (firstName) params.set('first_name', firstName);
        if (lastName) params.set('last_name', lastName);
      }
      if (phoneObj && phoneObj.number) {
        const fullPhone = `${phoneObj.country_code}${phoneObj.number}`;
        params.set('phone', fullPhone);
        params.set('customer_phone', fullPhone);
      }

      params.set('custom_metadata[manux_user_id]', user.id);
      params.set('custom_metadata[manux_plan]', plan);
      params.set('redirect_url', redirectUrl);
      params.set('cancel_url', cancelUrl);
      params.set('checkout', 'true');
      params.set('buy', '1');
      params.set('step', 'payment');
      params.set('quick', '1');

      // Append /checkout to the store product link to trigger direct checkout mode
      checkoutUrl = `${targetProduct.url}/checkout?${params.toString()}`;
    }

    return res.json({
      success: true,
      checkout_url: checkoutUrl,
      plan,
      product_id: productId,
      product_name: targetProduct.name,
      price_usd: targetProduct.price,
      currency: targetProduct.currency,
    });
  } catch (error: any) {
    console.error('[CHARIOW CHECKOUT] Internal error:', error);
    return res.status(500).json({
      error: 'CHECKOUT_INITIALIZATION_FAILED',
      message: error?.message || 'Impossible d’initialiser le paiement Chariow.',
    });
  }
});

// -------------------------------------------------------------
// 2. CHARIOW WEBHOOK / PULSE RECEIVER
// GET & POST /api/webhooks/chariow
// -------------------------------------------------------------
apiRouter.get('/webhooks/chariow', (_req: Request, res: Response) => {
  return res.json({
    status: 'online',
    message: 'Endpoint Webhook Chariow Pulse opérationnel. Chariow envoie ses requêtes en méthode POST lors des ventes.',
    supported_events: ['successful_sale', 'sale.completed', 'order.paid'],
    target_products: CHARIOW_LICENSE_PRODUCTS,
  });
});

apiRouter.post('/webhooks/chariow', async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const signature = req.headers['x-chariow-signature'] as string | undefined;

    console.log('[CHARIOW WEBHOOK] Received event payload:', {
      event: payload.event || payload.type || payload.event_type || 'pulse_event',
      has_signature: Boolean(signature),
      received_at: new Date().toISOString(),
    });

    // Extract event and sale fields
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
    )
      .trim()
      .toLowerCase();

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

    // Extract Chariow License Key if generated
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

    // Strict validation of Product ID mapping
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
      console.warn(
        `[CHARIOW WEBHOOK] Product ID "${productId}" is not a ManuX license product. Ignoring.`
      );
      return res.status(200).json({
        received: true,
        activated: false,
        warning: 'UNRECOGNIZED_PRODUCT_ID',
        product_id: productId,
      });
    }

    // Resolve target user if not directly in metadata
    if (!targetUserId && customerEmail) {
      const { data: foundProfile } = await supabaseServer
        .from('profiles')
        .select('id')
        .ilike('email', customerEmail)
        .maybeSingle();

      if (foundProfile?.id) {
        targetUserId = foundProfile.id;
      }
    }

    if (!targetUserId) {
      console.error(
        `[CHARIOW WEBHOOK] Could not match any user for sale ${saleId} (email: ${customerEmail})`
      );
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
      .select('id, subscription_plan')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!profile) {
      console.error(`[CHARIOW WEBHOOK] User ID ${targetUserId} not found in profiles`);
      return res.status(200).json({
        received: true,
        activated: false,
        error: 'USER_PROFILE_NOT_FOUND',
      });
    }

    // Idempotency: Check if sale was already recorded
    const { data: existingTx } = await supabaseServer
      .from('payment_transactions')
      .select('id, plan, provider_sale_id')
      .eq('provider', 'chariow')
      .eq('provider_sale_id', saleId)
      .maybeSingle();

    if (existingTx) {
      console.log(
        `[CHARIOW WEBHOOK] Sale ${saleId} already processed (idempotent response).`
      );
      return res.status(200).json({
        received: true,
        activated: true,
        idempotent: true,
        sale_id: saleId,
        plan: existingTx.plan,
      });
    }

    // Compute 30-day subscription cycle
    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Insert into payment_transactions
    await supabaseServer.from('payment_transactions').insert({
      user_id: targetUserId,
      provider: 'chariow',
      provider_sale_id: saleId,
      product_id: productId,
      plan: mappedPlan,
      amount: amount || expectedPrice,
      currency: currency || 'USD',
      status: 'completed',
      customer_email: customerEmail || null,
      license_key: licenseKey,
      raw_payload: payload,
      created_at: periodStart,
      processed_at: periodStart,
    });

    // 2. Insert into subscription_events
    await supabaseServer.from('subscription_events').insert({
      user_id: targetUserId,
      plan_id: mappedPlan,
      amount_paid: amount || expectedPrice,
      currency: currency || 'USD',
      payment_provider: 'chariow',
      provider_reference: saleId,
      status: 'completed',
      created_at: periodStart,
    });

    // 3. Update User Profile to Active Subscription
    await supabaseServer
      .from('profiles')
      .update({
        subscription_plan: mappedPlan,
        subscription_status: 'active',
        subscription_name: planName,
        subscription_provider: 'chariow',
        subscription_started_at: periodStart,
        subscription_expires_at: periodEnd,
        chariow_sale_id: saleId,
        chariow_product_id: productId,
        subscription_amount: amount || expectedPrice,
        subscription_currency: currency || 'USD',
        license_key: licenseKey,
        license_status: 'active',
        updated_at: periodStart,
      })
      .eq('id', targetUserId);

    // 4. Update or Upsert subscriptions table
    await supabaseServer.from('subscriptions').upsert(
      {
        user_id: targetUserId,
        plan_id: mappedPlan,
        status: 'active',
        current_period_start: periodStart,
        current_period_end: periodEnd,
        payment_provider: 'chariow',
        external_subscription_id: saleId,
        updated_at: periodStart,
      },
      { onConflict: 'user_id' }
    );

    console.log(
      `[CHARIOW WEBHOOK] Successfully upgraded user ${targetUserId} to ${mappedPlan.toUpperCase()} (Sale: ${saleId}, License: ${licenseKey || 'N/A'})`
    );

    return res.status(200).json({
      received: true,
      activated: true,
      user_id: targetUserId,
      plan: mappedPlan,
      sale_id: saleId,
      license_key: licenseKey,
      expires_at: periodEnd,
    });
  } catch (error: any) {
    console.error('[CHARIOW WEBHOOK] Error processing webhook:', error);
    return res.status(500).json({
      error: 'WEBHOOK_PROCESSING_FAILED',
      message: error?.message || 'Erreur lors du traitement du webhook.',
    });
  }
});

// -------------------------------------------------------------
// 3. CHECK SUBSCRIPTIONS EXPIRATIONS & SYNC STATUS
// GET /api/payments/status
// -------------------------------------------------------------
apiRouter.get('/payments/status', async (req: Request, res: Response) => {
  try {
    // Run expiration check via RPC or manual downgrade
    const now = new Date().toISOString();

    const { data: expiredProfiles } = await supabaseServer
      .from('profiles')
      .select('id, subscription_plan, subscription_expires_at')
      .not('subscription_expires_at', 'is', null)
      .lt('subscription_expires_at', now)
      .in('subscription_plan', ['creator', 'pro']);

    let downgradedCount = 0;
    if (expiredProfiles && expiredProfiles.length > 0) {
      for (const p of expiredProfiles) {
        await supabaseServer
          .from('profiles')
          .update({
            subscription_plan: 'free',
            subscription_status: 'expired',
            subscription_name: 'Plan Gratuit',
            updated_at: now,
          })
          .eq('id', p.id);

        downgradedCount++;
      }
    }

    return res.json({
      status: 'ok',
      timestamp: now,
      downgraded_count: downgradedCount,
      chariow_products: CHARIOW_LICENSE_PRODUCTS,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message });
  }
});

// Mount router on both /api and / so it matches seamlessly in all environments (Vercel & standalone)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// -------------------------------------------------------------
// VITE MIDDLEWARE / SPA SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ManuX Server] Running on http://0.0.0.0:${PORT}`);
  });
}

// Start standalone server unless executing inside Vercel serverless functions
if (!process.env.VERCEL) {
  startServer();
}

export default app;
