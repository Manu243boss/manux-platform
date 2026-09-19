/**
 * Cache Service for ManuX
 * High-performance hybrid memory + localStorage cache with Time-To-Live (TTL)
 * and stale-while-revalidate pattern to avoid redundant Supabase/API requests,
 * save device bandwidth, and persist user session/data across browser reloads.
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const MEMORY_CACHE = new Map<string, CacheItem<unknown>>();

export const CACHE_KEYS = {
  HOME_FEED: 'manux_home_feed',
  CATEGORIES: 'manux_categories',
  FEATURED_PRODUCTS: 'manux_featured_products',
  FEATURED_VIDEOS: 'manux_featured_videos',
  CREATORS: 'manux_creators',
  CHARIOW_PRODUCTS: 'manux_chariow_products',
  CURRENCY_RATES: 'manux_currency_rates',
  USER_PROFILE: (userId: string) => `manux_profile_${userId}`,
  USER_SESSION: 'manux_user_session',
  USER_PRODUCTS: (userId: string) => `manux_products_${userId}`,
  USER_VIDEOS: (userId: string) => `manux_videos_${userId}`,
  USER_STORE: (userId: string) => `manux_store_${userId}`,
  USER_ANALYTICS: (userId: string) => `manux_analytics_${userId}`,
};

export class CacheService {
  /**
   * Get cached data by key. Returns null if expired or missing.
   */
  public static get<T>(key: string): T | null {
    const now = Date.now();

    // 1. Check in-memory first (instantaneous)
    if (MEMORY_CACHE.has(key)) {
      const item = MEMORY_CACHE.get(key) as CacheItem<T>;
      if (now - item.timestamp < item.ttl) {
        return item.data;
      }
      MEMORY_CACHE.delete(key);
    }

    // 2. Check localStorage (persistent on device)
    try {
      const raw = localStorage.getItem(`manux_c_${key}`);
      if (raw) {
        const item = JSON.parse(raw) as CacheItem<T>;
        if (now - item.timestamp < item.ttl) {
          // Warm memory cache
          MEMORY_CACHE.set(key, item);
          return item.data;
        }
        localStorage.removeItem(`manux_c_${key}`);
      }
    } catch {
      // Ignore storage errors (private mode, quota)
    }

    return null;
  }

  /**
   * Set cached data with TTL (default 10 minutes)
   */
  public static set<T>(key: string, data: T, ttlMs: number = 10 * 60 * 1000): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    MEMORY_CACHE.set(key, item as CacheItem<unknown>);

    try {
      localStorage.setItem(`manux_c_${key}`, JSON.stringify(item));
    } catch {
      // Storage might be full or private mode - silent fallback to memory cache
    }
  }

  /**
   * Fetch with cache: Returns cached data if valid, otherwise executes fetcher and caches result.
   */
  public static async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 10 * 60 * 1000,
    forceRefresh: boolean = false
  ): Promise<T> {
    if (!forceRefresh) {
      const cached = this.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    }

    const freshData = await fetcher();
    this.set(key, freshData, ttlMs);
    return freshData;
  }

  /**
   * Remove a specific cache item
   */
  public static invalidate(key: string): void {
    MEMORY_CACHE.delete(key);
    try {
      localStorage.removeItem(`manux_c_${key}`);
    } catch {
      // Ignore
    }
  }

  /**
   * Invalidate by prefix
   */
  public static invalidatePrefix(prefix: string): void {
    const memKeys = Array.from(MEMORY_CACHE.keys());
    memKeys.forEach((k) => {
      if (k.startsWith(prefix)) MEMORY_CACHE.delete(k);
    });

    try {
      const storagePrefix = `manux_c_${prefix}`;
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(storagePrefix) || k.startsWith(`manux_c_${prefix}`))) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }

  /**
   * Invalidate by pattern (contains string)
   */
  public static invalidatePattern(pattern: string): void {
    const memKeys = Array.from(MEMORY_CACHE.keys());
    memKeys.forEach((k) => {
      if (k.includes(pattern)) MEMORY_CACHE.delete(k);
    });

    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes(pattern)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }

  /**
   * Clear all manux caches
   */
  public static clearAll(): void {
    MEMORY_CACHE.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('manux_c_') || k.startsWith('manux_cache_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}
