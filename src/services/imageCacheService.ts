/**
 * ManuX Image Cache Service
 * Provides client-side local caching for product images, video thumbnails, and profile avatars.
 * Uses the browser Cache API with fallback to in-memory Blob URLs and localStorage metadata
 * to minimize Supabase Storage and external egress requests.
 */

const CACHE_NAME = 'manux-media-cache-v1';
const MEMORY_CACHE = new Map<string, string>();
const PENDING_REQUESTS = new Map<string, Promise<string>>();

export class ImageCacheService {
  /**
   * Check if Cache API is supported
   */
  private static isCacheSupported(): boolean {
    return typeof window !== 'undefined' && 'caches' in window;
  }

  /**
   * Get an image URL from local cache or fetch and store it locally
   */
  static async getCachedImageUrl(url: string): Promise<string> {
    if (!url || typeof url !== 'string') return url;

    // Skip caching for inline data URLs or blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    // 1. Check in-memory Map
    if (MEMORY_CACHE.has(url)) {
      return MEMORY_CACHE.get(url)!;
    }

    // 2. Check if a request for this URL is already pending
    if (PENDING_REQUESTS.has(url)) {
      return PENDING_REQUESTS.get(url)!;
    }

    // 3. Fetch from Cache API or Network
    const fetchPromise = (async () => {
      try {
        if (this.isCacheSupported()) {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(url);

          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            const objectUrl = URL.createObjectURL(blob);
            MEMORY_CACHE.set(url, objectUrl);
            return objectUrl;
          }

          // Fetch from network with cors mode
          try {
            const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (response.ok) {
              // Store in Cache API
              await cache.put(url, response.clone());
              const blob = await response.blob();
              const objectUrl = URL.createObjectURL(blob);
              MEMORY_CACHE.set(url, objectUrl);
              return objectUrl;
            }
          } catch {
            // CORS restriction or offline: return original URL as fallback
            return url;
          }
        }
      } catch (err) {
        console.debug('[ManuX Image Cache] Error caching image:', err);
      }
      return url;
    })();

    PENDING_REQUESTS.set(url, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      PENDING_REQUESTS.delete(url);
    }
  }

  /**
   * Prefetch and pre-warm a list of image URLs
   */
  static prefetchImages(urls: (string | undefined | null)[]) {
    if (typeof window === 'undefined') return;
    const validUrls = urls.filter((u): u is string => Boolean(u && typeof u === 'string'));
    
    // Batch in idle callback or timer
    const runner = () => {
      validUrls.forEach((url) => {
        this.getCachedImageUrl(url).catch(() => {});
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runner);
    } else {
      setTimeout(runner, 1000);
    }
  }

  /**
   * Clear old cache
   */
  static async clearCache(): Promise<void> {
    MEMORY_CACHE.clear();
    if (this.isCacheSupported()) {
      try {
        await caches.delete(CACHE_NAME);
      } catch {
        // Ignore
      }
    }
  }
}
