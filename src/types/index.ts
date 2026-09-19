export * from './database';

export interface ChariowStoreInfo {
  id: string;
  name: string;
  subdomain?: string;
  currency: string;
  logo_url?: string;
  total_products?: number;
}

export interface ChariowProductItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  thumbnail?: string;
  url?: string;
  status: 'draft' | 'published';
  created_at?: string;
}

export interface ChariowConnectionState {
  isConnected: boolean;
  storeId?: string;
  storeName?: string;
  lastSyncedAt?: string;
}

export type SupportedCurrency = 'CDF' | 'USD' | 'XAF' | 'EUR' | 'KES' | 'NGN';

export interface CurrencyRate {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  rateAgainstUSD: number;
}
