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
      // Try local server proxy endpoint first
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

      if (response.ok) {
        const json = await response.json();
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

      if (response.status === 404) {
        return {
          success: false,
          message: 'Point d\'accès Chariow non disponible (404). Vérifiez votre URL de boutique.',
        };
      }

      return {
        success: false,
        message: `Erreur Chariow API (Code: ${response.status})`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Impossible de contacter l\'API Chariow. Vérifiez votre connexion Internet.',
      };
    }
  }

  /**
   * Fetch products from connected Chariow store via server proxy
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

    try {
      const queryParams = new URLSearchParams();
      if (options?.limit) queryParams.set('limit', String(options.limit));
      if (options?.cursor) queryParams.set('cursor', options.cursor);
      if (options?.storeUrl) queryParams.set('store_url', options.storeUrl);

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

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 401) {
          return {
            products: [],
            error: 'Clé API Chariow invalide ou expirée (401). Vérifiez la clé saisie.',
          };
        }
        if (response.status === 404) {
          return {
            products: [],
            error: 'Le serveur de synchronisation Chariow a retourné une erreur 404. Assurez-vous que l’application backend est active.',
          };
        }
        return {
          products: [],
          error: errJson?.message || `Erreur de connexion API Chariow (${response.status})`,
        };
      }

      const resData = await response.json();
      const products: ChariowProductNormalized[] = resData.data || [];

      return {
        products,
        has_more: resData.has_more ?? false,
        next_cursor: resData.next_cursor || null,
      };
    } catch (err: any) {
      return { products: [], error: err?.message || 'Échec de synchronisation Chariow' };
    }
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
