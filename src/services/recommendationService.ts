/**
 * Recommendation Service for ManuX
 * Provides an intelligent, hybrid recommendation engine inspired by modern media algorithms.
 * 
 * Features:
 * - Weighted engagement score: Views (1x) + Clicks (2.5x) + Comments (3x) + Purchases/External Clicks (5x)
 * - Freshness boost for new products and videos (last 7 days boost) to guarantee discovery
 * - Balanced Feed Composition: 65% Videos / 35% Products
 * - Cache-assisted to avoid continuous heavy Supabase queries
 * - Category & Creator contextual recommendations
 */

import { supabase } from '../lib/supabase';
import { Product, Video as VideoType } from '../types';
import { CacheService, CACHE_KEYS } from './cacheService';

export type MixedFeedItem =
  | {
      type: 'video';
      id: string;
      item: VideoType;
      score: number;
    }
  | {
      type: 'product';
      id: string;
      item: Product;
      score: number;
    };

export class RecommendationService {
  /**
   * Calculates a discovery engagement score
   */
  public static calculateScore(
    stats: {
      views?: number;
      clicks?: number;
      comments?: number;
      purchases?: number;
      createdAt?: string;
    }
  ): number {
    const views = stats.views || 0;
    const clicks = stats.clicks || 0;
    const comments = stats.comments || 0;
    const purchases = stats.purchases || 0;

    let score = views * 1.0 + clicks * 2.5 + comments * 3.0 + purchases * 5.0;

    // Freshness boost: Boost items created in the last 7 days by up to 25 points
    if (stats.createdAt) {
      const ageHours = (Date.now() - new Date(stats.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) {
        score += 35; // Brand new today
      } else if (ageHours < 72) {
        score += 20; // 1-3 days old
      } else if (ageHours < 168) {
        score += 10; // Within 7 days
      }
    }

    return Math.max(score, 1);
  }

  /**
   * Generates the home mixed feed (65% videos, 35% products) with recommendation ranking
   */
  public static async getHomeFeed(options?: {
    categorySlug?: string;
    forceRefresh?: boolean;
  }): Promise<MixedFeedItem[]> {
    const { categorySlug, forceRefresh = false } = options || {};
    const cacheKey = `${CACHE_KEYS.HOME_FEED}_${categorySlug || 'all'}`;

    return CacheService.getOrFetch(
      cacheKey,
      async () => {
        // 1. Fetch published videos with profile & product joins
        let videoQuery = supabase
          .from('videos')
          .select('*, profile:profiles(*), product:products(*)')
          .or('status.eq.published,status.is.null')
          .order('created_at', { ascending: false })
          .limit(40);

        // 2. Fetch published products with profile & category joins
        let productQuery = supabase
          .from('products')
          .select('*, profile:profiles(*), category:categories(*)')
          .or('status.eq.published,status.is.null')
          .order('created_at', { ascending: false })
          .limit(40);

        const [videoRes, productRes] = await Promise.all([videoQuery, productQuery]);

        let rawVideos: VideoType[] = videoRes.data || [];
        let rawProducts: Product[] = productRes.data || [];

        // Filter by category if requested
        if (categorySlug && categorySlug !== 'Tout') {
          const lower = categorySlug.toLowerCase();
          rawVideos = rawVideos.filter(
            (v) =>
              v.title.toLowerCase().includes(lower) ||
              v.description?.toLowerCase().includes(lower) ||
              v.product?.category?.name.toLowerCase().includes(lower)
          );
          rawProducts = rawProducts.filter(
            (p) =>
              p.title.toLowerCase().includes(lower) ||
              p.category?.name?.toLowerCase().includes(lower) ||
              p.category?.slug?.toLowerCase().includes(lower)
          );
        }

        // Rank videos
        const scoredVideos = rawVideos.map((v) => ({
          type: 'video' as const,
          id: v.id,
          item: v,
          score: RecommendationService.calculateScore({
            views: v.views_count,
            createdAt: v.created_at,
          }),
        }));
        scoredVideos.sort((a, b) => b.score - a.score);

        // Rank products
        const scoredProducts = rawProducts.map((p) => {
          const meta = p.metadata || {};
          return {
            type: 'product' as const,
            id: p.id,
            item: p,
            score: RecommendationService.calculateScore({
              views: meta.views_count || 0,
              clicks: meta.clicks_count || 0,
              purchases: meta.external_clicks_count || 0,
              createdAt: p.created_at,
            }),
          };
        });
        scoredProducts.sort((a, b) => b.score - a.score);

        // Interleave with 65% videos / 35% products ratio:
        // Pattern: [Video, Video, Product, Video, Video, Product, ...]
        const mixedFeed: MixedFeedItem[] = [];
        let vIdx = 0;
        let pIdx = 0;

        while (vIdx < scoredVideos.length || pIdx < scoredProducts.length) {
          // Add up to 2 videos
          if (vIdx < scoredVideos.length) {
            mixedFeed.push(scoredVideos[vIdx++]);
          }
          if (vIdx < scoredVideos.length) {
            mixedFeed.push(scoredVideos[vIdx++]);
          }

          // Add 1 product
          if (pIdx < scoredProducts.length) {
            mixedFeed.push(scoredProducts[pIdx++]);
          } else if (vIdx < scoredVideos.length) {
            // If no more products, add another video
            mixedFeed.push(scoredVideos[vIdx++]);
          }
        }

        return mixedFeed;
      },
      5 * 60 * 1000, // 5 min TTL
      forceRefresh
    );
  }

  /**
   * Fetch mixed recommendations for a specific product (related videos + similar products)
   */
  public static async getProductRecommendations(productId: string, categoryId?: string | null): Promise<{
    videos: VideoType[];
    products: Product[];
  }> {
    const cacheKey = `prod_rec_${productId}`;

    return CacheService.getOrFetch(
      cacheKey,
      async () => {
        // 1. Fetch videos associated with this product or category
        const { data: vids } = await supabase
          .from('videos')
          .select('*, profile:profiles(*), product:products(*)')
          .or('status.eq.published,status.is.null,status.eq.active')
          .neq('product_id', productId)
          .limit(6);

        // 2. Fetch similar products
        let prodQuery = supabase
          .from('products')
          .select('*, profile:profiles(*), category:categories(*)')
          .or('status.eq.published,status.is.null,status.eq.active')
          .neq('id', productId);

        if (categoryId) {
          prodQuery = prodQuery.eq('category_id', categoryId);
        }

        const { data: prods } = await prodQuery.limit(6);

        // If category query gave nothing, fetch general products
        let finalProds = prods || [];
        if (finalProds.length === 0) {
          const { data: genProds } = await supabase
            .from('products')
            .select('*, profile:profiles(*), category:categories(*)')
            .or('status.eq.published,status.is.null,status.eq.active')
            .neq('id', productId)
            .limit(6);
          finalProds = genProds || [];
        }

        return {
          videos: vids || [],
          products: finalProds,
        };
      },
      10 * 60 * 1000
    );
  }
}
