/**
 * Recommendation Service for ManuX
 * Provides an intelligent, hybrid multi-criteria recommendation engine inspired by modern media & marketplace algorithms.
 * 
 * Multi-Factor Scoring:
 * 1. Engagement & Conversion: Views (1x) + Video Plays (2x) + Clicks (2.5x) + Comments (3.5x) + External Chariow Intent (5x)
 * 2. Freshness & Discovery Decay (Half-life boost to give new creators immediate organic exposure)
 * 3. Creator Credibility: Verified creators & active stores receive quality signals
 * 4. Contextual & Category Affinity: Recommends complementary content in matching niches
 * 5. Balanced Mixed Feed: 65% interactive video demonstrations / 35% direct product showcases
 * 6. Exploration vs. Exploitation: Jitter algorithm preventing echo-chambers
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
   * Tracks user interaction history locally to compute dynamic category & creator affinity
   */
  public static recordLocalInteraction(type: 'product' | 'video' | 'category' | 'creator', idOrSlug: string) {
    try {
      const storageKey = 'manux_user_affinity_v1';
      const raw = localStorage.getItem(storageKey);
      const history: { type: string; id: string; timestamp: number }[] = raw ? JSON.parse(raw) : [];
      
      history.unshift({ type, id: idOrSlug, timestamp: Date.now() });
      // Keep last 30 interactions
      const trimmed = history.slice(0, 30);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch {
      // Ignore private browsing storage errors
    }
  }

  /**
   * Retrieves user's top affinity tags/categories from recent browsing
   */
  private static getUserAffinities(): string[] {
    try {
      const storageKey = 'manux_user_affinity_v1';
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const history: { type: string; id: string; timestamp: number }[] = JSON.parse(raw);
      return history.map((h) => h.id.toLowerCase());
    } catch {
      return [];
    }
  }

  /**
   * Calculates a multi-dimensional recommendation score
   */
  public static calculateScore(
    stats: {
      views?: number;
      clicks?: number;
      comments?: number;
      purchases?: number;
      createdAt?: string;
      isVerified?: boolean;
      categorySlug?: string;
      creatorId?: string;
    },
    userAffinities: string[] = []
  ): number {
    const views = Number(stats.views) || 0;
    const clicks = Number(stats.clicks) || 0;
    const comments = Number(stats.comments) || 0;
    const purchases = Number(stats.purchases) || 0;

    // 1. Engagement Base
    let score = views * 1.0 + clicks * 2.5 + comments * 3.5 + purchases * 5.0;

    // 2. Freshness Boost (Time-decay half-life)
    if (stats.createdAt) {
      const ageHours = (Date.now() - new Date(stats.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) {
        score += 40; // Brand new today: instant discovery boost
      } else if (ageHours < 72) {
        score += 25; // 1-3 days
      } else if (ageHours < 168) {
        score += 15; // Within 1 week
      } else if (ageHours < 720) {
        score += 5; // Within 1 month
      }
    }

    // 3. Creator Quality Factor
    if (stats.isVerified) {
      score += 10;
    }

    // 4. Personalized Interest Affinity Factor
    if (userAffinities.length > 0) {
      if (stats.categorySlug && userAffinities.includes(stats.categorySlug.toLowerCase())) {
        score += 25; // High contextual match
      }
      if (stats.creatorId && userAffinities.includes(stats.creatorId.toLowerCase())) {
        score += 20; // Creator affinity
      }
    }

    // 5. Exploration jitter (5% random variance to avoid deterministic ranking loops)
    const jitter = Math.random() * 3.0;
    score += jitter;

    return Math.max(score, 1);
  }

  /**
   * Generates the home mixed feed (65% videos, 35% products) with intelligent ranking
   */
  public static async getHomeFeed(options?: {
    categorySlug?: string;
    forceRefresh?: boolean;
  }): Promise<MixedFeedItem[]> {
    const { categorySlug, forceRefresh = false } = options || {};
    const affinities = RecommendationService.getUserAffinities();
    const cacheKey = `${CACHE_KEYS.HOME_FEED}_${categorySlug || 'all'}_${affinities.slice(0, 3).join('-')}`;

    return CacheService.getOrFetch(
      cacheKey,
      async () => {
        // 1. Fetch published videos with profile & product joins
        const videoQuery = supabase
          .from('videos')
          .select('*, profile:profiles(*), product:products(*)')
          .or('status.eq.published,status.is.null,status.eq.active')
          .order('created_at', { ascending: false })
          .limit(50);

        // 2. Fetch published products with profile & category joins
        const productQuery = supabase
          .from('products')
          .select('*, profile:profiles(*), category:categories(*)')
          .or('status.eq.published,status.is.null,status.eq.active')
          .order('created_at', { ascending: false })
          .limit(50);

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
              v.product?.category?.name?.toLowerCase().includes(lower)
          );
          rawProducts = rawProducts.filter(
            (p) =>
              p.title.toLowerCase().includes(lower) ||
              p.category?.name?.toLowerCase().includes(lower) ||
              p.category?.slug?.toLowerCase().includes(lower)
          );
        }

        // Rank videos with engagement & freshness
        const scoredVideos = rawVideos.map((v) => ({
          type: 'video' as const,
          id: v.id,
          item: v,
          score: RecommendationService.calculateScore(
            {
              views: v.views_count,
              createdAt: v.created_at,
              isVerified: (v.profile as any)?.is_verified,
              categorySlug: v.product?.category?.slug || undefined,
              creatorId: v.user_id,
            },
            affinities
          ),
        }));
        scoredVideos.sort((a, b) => b.score - a.score);

        // Rank products with metadata metrics & affinities
        const scoredProducts = rawProducts.map((p) => {
          const meta = p.metadata || {};
          return {
            type: 'product' as const,
            id: p.id,
            item: p,
            score: RecommendationService.calculateScore(
              {
                views: meta.views_count || 0,
                clicks: meta.clicks_count || 0,
                purchases: meta.external_clicks_count || 0,
                createdAt: p.created_at,
                isVerified: (p.profile as any)?.is_verified,
                categorySlug: p.category?.slug || undefined,
                creatorId: p.user_id,
              },
              affinities
            ),
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
            mixedFeed.push(scoredVideos[vIdx++]);
          }
        }

        return mixedFeed;
      },
      3 * 60 * 1000, // 3 min cache TTL
      forceRefresh
    );
  }

  /**
   * Fetch smart mixed recommendations for a specific product
   */
  public static async getProductRecommendations(productId: string, categoryId?: string | null): Promise<{
    videos: VideoType[];
    products: Product[];
  }> {
    const cacheKey = `prod_rec_${productId}_${categoryId || 'nocat'}`;

    return CacheService.getOrFetch(
      cacheKey,
      async () => {
        // 1. Fetch videos directly linked to this product or creator
        const { data: directVids } = await supabase
          .from('videos')
          .select('*, profile:profiles(*), product:products(*)')
          .or('status.eq.published,status.is.null,status.eq.active')
          .eq('product_id', productId)
          .limit(4);

        // 2. Fetch other discovery videos
        const { data: generalVids } = await supabase
          .from('videos')
          .select('*, profile:profiles(*), product:products(*)')
          .or('status.eq.published,status.is.null,status.eq.active')
          .neq('product_id', productId)
          .order('views_count', { ascending: false })
          .limit(6);

        const mergedVideos = [...(directVids || []), ...(generalVids || [])].slice(0, 6);

        // 3. Fetch similar category products
        let prodQuery = supabase
          .from('products')
          .select('*, profile:profiles(*), category:categories(*)')
          .or('status.eq.published,status.is.null,status.eq.active')
          .neq('id', productId);

        if (categoryId) {
          prodQuery = prodQuery.eq('category_id', categoryId);
        }

        const { data: catProds } = await prodQuery.limit(6);

        let finalProds = catProds || [];
        if (finalProds.length === 0) {
          const { data: fallbackProds } = await supabase
            .from('products')
            .select('*, profile:profiles(*), category:categories(*)')
            .or('status.eq.published,status.is.null,status.eq.active')
            .neq('id', productId)
            .order('created_at', { ascending: false })
            .limit(6);
          finalProds = fallbackProds || [];
        }

        return {
          videos: mergedVideos,
          products: finalProds,
        };
      },
      5 * 60 * 1000
    );
  }

  /**
   * Fetch recommendations tailored for video watch pages (related videos + associated product)
   */
  public static async getVideoRecommendations(videoId: string, creatorId?: string, productId?: string | null): Promise<{
    relatedVideos: VideoType[];
    associatedProduct: Product | null;
  }> {
    const cacheKey = `vid_rec_${videoId}`;

    return CacheService.getOrFetch(
      cacheKey,
      async () => {
        // Fetch creator other videos or popular platform videos
        let vidQuery = supabase
          .from('videos')
          .select('*, profile:profiles(*), product:products(*)')
          .or('status.eq.published,status.is.null,status.eq.active')
          .neq('id', videoId);

        if (creatorId) {
          vidQuery = vidQuery.eq('user_id', creatorId);
        }

        let { data: vids } = await vidQuery.limit(6);

        if (!vids || vids.length < 3) {
          const { data: fallbackVids } = await supabase
            .from('videos')
            .select('*, profile:profiles(*), product:products(*)')
            .or('status.eq.published,status.is.null,status.eq.active')
            .neq('id', videoId)
            .order('views_count', { ascending: false })
            .limit(8);
          vids = [...(vids || []), ...(fallbackVids || [])].filter(
            (v, idx, self) => self.findIndex((x) => x.id === v.id) === idx
          );
        }

        // Fetch associated product if available
        let associatedProduct: Product | null = null;
        if (productId) {
          const { data: prod } = await supabase
            .from('products')
            .select('*, profile:profiles(*), category:categories(*)')
            .eq('id', productId)
            .single();
          associatedProduct = prod || null;
        }

        return {
          relatedVideos: vids || [],
          associatedProduct,
        };
      },
      5 * 60 * 1000
    );
  }
}
