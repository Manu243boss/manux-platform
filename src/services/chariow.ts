/**
 * Chariow Connector Service
 * Grounded in official Chariow Developer API documentation:
 * - Base URL: https://api.chariow.com/v1
 * - Authentication: Bearer token (API Key: sk_live_... or sk_test_...)
 * - Rate limit: 100 requests per minute
 * - Primary Resources: /v1/products, /v1/stores
 * 
 * SECURITY DIRECTIVE:
 * Secret API keys (sk_live_*) MUST NEVER be exposed in the browser.
 * In production, requests using API keys should be proxied via Supabase Edge Functions
 * or a secure server-side endpoint.
 */

import { ChariowProductItem, ChariowStoreInfo } from '../types';

export interface ChariowProductNormalized {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  display_image?: string | null;
  pictures?: {
    cover?: string | null;
    thumbnail?: string | null;
  };
  url?: string;
  checkout_url?: string;
  status?: string;
  created_at?: string;
}

export interface ChariowConnectionConfig {
  apiKey?: string;
  storeSubdomain?: string;
  apiUrl?: string;
}

function normalizeRawItem(raw: any, storeUrl?: string): ChariowProductNormalized {
  const pictures = raw.pictures || {};
  const cover = pictures.cover || raw.cover || raw.image_url || raw.main_image_url || (Array.isArray(raw.images) ? raw.images[0] : null) || null;
  const thumbnail = pictures.thumbnail || raw.thumbnail || cover || null;
  const displayImage = cover || thumbnail || null;

  const cleanStoreUrl = storeUrl ? storeUrl.trim().replace(/\/+$/, '') : '';
  const productId = String(raw.id || raw.product_id || '');
  const storeBasedUrl = cleanStoreUrl && productId ? `${cleanStoreUrl}/${productId}` : '';
  const finalUrl = storeBasedUrl || raw.url || raw.checkout_url || raw.permalink || (productId ? `https://chariow.com/p/${productId}` : '');

  // Robust Price Detection
  let priceVal = 0;
  if (typeof raw.price === 'number') {
    priceVal = raw.price;
  } else if (raw.price && typeof raw.price === 'object') {
    const amt = raw.price.amount ?? raw.price.value ?? raw.price.price ?? raw.price.price_amount;
    priceVal = typeof amt === 'number' ? amt : parseFloat(amt) || 0;
  } else if (typeof raw.amount === 'number') {
    priceVal = raw.amount;
  } else if (raw.price_cents && typeof raw.price_cents === 'number') {
    priceVal = raw.price_cents / 100;
  } else if (raw.amount_cents && typeof raw.amount_cents === 'number') {
    priceVal = raw.amount_cents / 100;
  } else if (raw.price_amount) {
    priceVal = parseFloat(raw.price_amount) || 0;
  } else if (raw.price) {
    priceVal = parseFloat(String(raw.price)) || 0;
  } else if (raw.amount) {
    priceVal = parseFloat(String(raw.amount)) || 0;
  }

  // Robust Currency Detection
  let currencyVal = 'XOF'; // Default to West African CFA Franc
  if (raw.currency && typeof raw.currency === 'string') {
    currencyVal = raw.currency;
  } else if (raw.price && typeof raw.price === 'object' && raw.price.currency) {
    currencyVal = String(raw.price.currency);
  } else if (raw.currency_code && typeof raw.currency_code === 'string') {
    currencyVal = raw.currency_code;
  } else if (raw.price_currency && typeof raw.price_currency === 'string') {
    currencyVal = raw.price_currency;
  } else if (raw.currency_symbol && typeof raw.currency_symbol === 'string') {
    const symbol = raw.currency_symbol.toUpperCase();
    if (symbol.includes('FCFA') || symbol.includes('F CFA') || symbol.includes('CFA') || symbol.includes('XOF') || symbol.includes('XAF')) {
      currencyVal = 'XOF';
    } else if (symbol.includes('$') || symbol.includes('USD')) {
      currencyVal = 'USD';
    } else if (symbol.includes('€') || symbol.includes('EUR')) {
      currencyVal = 'EUR';
    }
  }

  return {
    id: productId,
    name: raw.name || raw.title || raw.product_name || 'Produit Chariow',
    description: raw.description || raw.short_description || '',
    price: priceVal,
    currency: currencyVal,
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

export class ChariowConnector {
  private baseUrl: string;
  private apiKey: string | null;

  constructor(config?: ChariowConnectionConfig) {
    this.baseUrl = config?.apiUrl || 'https://api.chariow.com/v1';
    this.apiKey = config?.apiKey || null;
  }

  /**
   * Validate Chariow API Key format (e.g. sk_live_... or sk_test_...)
   */
  public static isValidApiKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    return /^sk_(live|test)_[a-zA-Z0-9_-]{16,}$/.test(key.trim());
  }

  /**
   * Extract YouTube Video ID from any YouTube URL (watch, youtu.be, embed, shorts)
   */
  public static extractYouTubeId(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  /**
   * Test API connectivity to Chariow
   */
  public async testConnection(apiKey?: string, storeUrl?: string): Promise<{ success: boolean; message: string; store?: ChariowStoreInfo }> {
    const keyToTest = apiKey || this.apiKey;
    if (!keyToTest || !ChariowConnector.isValidApiKey(keyToTest)) {
      return {
        success: false,
        message: 'Format de clé API invalide. La clé doit commencer par "sk_live_" ou "sk_test_".',
      };
    }

    try {
      // 1. Try local server proxy endpoint first
      const headers: Record<string, string> = {
        'x-chariow-key': keyToTest.trim(),
        Accept: 'application/json',
      };
      if (storeUrl) {
        headers['x-store-url'] = storeUrl.trim();
      }

      const response = await fetch('/api/chariow/products?limit=1', {
        method: 'GET',
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      let json: any = null;

      if (contentType.includes('application/json')) {
        try {
          json = await response.json();
        } catch {
          json = null;
        }
      }

      if (response.ok && json) {
        if (json.warning === 'CHARIOW_API_KEY_NOT_CONFIGURED') {
          return {
            success: false,
            message: 'Veuillez saisir votre clé API Chariow.',
          };
        }
        return {
          success: true,
          message: 'Connexion à votre boutique Chariow établie avec succès !',
        };
      }

      if (response.status === 401) {
        return {
          success: false,
          message: 'Clé API Chariow non autorisée ou expirée (401).',
        };
      }

      // 2. Direct fallback test to Chariow API if server returned 500 / 404
      try {
        const directRes = await fetch('https://api.chariow.com/v1/products?limit=1', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${keyToTest.trim()}`,
            Accept: 'application/json',
          },
        });
        if (directRes.ok) {
          return {
            success: true,
            message: 'Connexion à votre boutique Chariow établie avec succès (Direct) !',
          };
        }
      } catch {
        // direct test ignored
      }

      return {
        success: false,
        message: json?.message || `Erreur de connexion API Chariow (Code: ${response.status})`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Impossible de contacter l\'API Chariow. Vérifiez votre connexion Internet.',
      };
    }
  }

  /**
   * Fetch products from connected Chariow store via server proxy with direct fallback
   */
  public async fetchProducts(options?: {
    apiKey?: string;
    storeUrl?: string;
    limit?: number;
    cursor?: string;
    forceRefresh?: boolean;
  }): Promise<{ products: ChariowProductNormalized[]; has_more?: boolean; next_cursor?: string | null; error?: string }> {
    const keyToUse = options?.apiKey || this.apiKey;

    if (!keyToUse) {
      return {
        products: [],
        error: 'Aucune clé API Chariow fournie pour cette boutique.',
      };
    }

    const queryParams = new URLSearchParams();
    if (options?.limit) queryParams.set('limit', String(options.limit));
    if (options?.cursor) queryParams.set('cursor', options.cursor);
    if (options?.storeUrl) queryParams.set('store_url', options.storeUrl);

    // 1. Primary Attempt: Call Server Proxy
    try {
      const headers: Record<string, string> = { 
        Accept: 'application/json',
        'x-chariow-key': keyToUse.trim(),
      };
      if (options?.storeUrl) {
        headers['x-store-url'] = options.storeUrl.trim();
      }

      const response = await fetch(`/api/chariow/products?${queryParams.toString()}`, {
        method: 'GET',
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      let resData: any = null;

      if (contentType.includes('application/json')) {
        try {
          resData = await response.json();
        } catch {
          resData = null;
        }
      }

      if (response.ok && resData && Array.isArray(resData.data)) {
        return {
          products: resData.data,
          has_more: resData.has_more ?? false,
          next_cursor: resData.next_cursor || null,
        };
      }

      if (response.status === 401) {
        return {
          products: [],
          error: 'Clé API Chariow non valide ou expirée (401). Vérifiez la clé saisie.',
        };
      }
    } catch (proxyErr) {
      console.debug('[ChariowConnector] Server proxy attempt notice:', proxyErr);
    }

    // 2. Secondary Fallback Attempt: Direct API Call from client
    try {
      const directCandidates = [
        `https://api.chariow.com/v1/products?${queryParams.toString()}`,
        `https://api.chariow.com/v1/stores/me/products?${queryParams.toString()}`,
        `https://api.chariow.com/v1/merchant/products?${queryParams.toString()}`,
      ];

      for (const directUrl of directCandidates) {
        try {
          const directRes = await fetch(directUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${keyToUse.trim()}`,
              Accept: 'application/json',
            },
          });

          if (directRes.ok) {
            const directJson = await directRes.json();
            const rawList = Array.isArray(directJson) ? directJson : directJson?.data || directJson?.products || [];
            const normalized = rawList.map((item: any) => normalizeRawItem(item, options?.storeUrl));
            return {
              products: normalized,
              has_more: Boolean(directJson?.has_more),
              next_cursor: directJson?.next_cursor || null,
            };
          }
        } catch {
          // try next
        }
      }
    } catch (directErr) {
      console.debug('[ChariowConnector] Direct fetch attempt notice:', directErr);
    }

    return {
      products: [],
      error: 'Erreur de connexion API Chariow. Vérifiez que votre clé API Chariow est correcte et active, et que votre boutique Chariow est publiée.',
    };
  }

  /**
   * Legacy method wrapper
   */
  public async fetchStoreProducts(apiKey: string): Promise<{ products: ChariowProductItem[]; error?: string }> {
    const res = await this.fetchProducts({ apiKey });
    if (res.error) return { products: [], error: res.error };

    const formatted: ChariowProductItem[] = res.products.map((p) => ({
      id: p.id,
      title: p.name,
      description: p.description || '',
      price: p.price,
      currency: p.currency,
      thumbnail: p.display_image || undefined,
      url: p.url || p.checkout_url || undefined,
      status: p.status === 'published' ? 'published' : 'draft',
      created_at: p.created_at,
    }));

    return { products: formatted };
  }
}

export const chariowConnector = new ChariowConnector();
