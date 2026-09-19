import React, { useEffect, useState, useMemo } from 'react';
import {
  Play,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Category, Product, Video as VideoType } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { CurrencyService } from '../services/currency';
import { SeoHead } from '../components/ui/SeoHead';
import { PromoDiscountCard } from '../components/ui/PromoDiscountCard';
import { HorizontalScrollMenu } from '../components/ui/HorizontalScrollMenu';
import { RecommendationService, MixedFeedItem } from '../services/recommendationService';
import { HomeProductFeedCard } from '../components/products/HomeProductFeedCard';
import { VerifiedBadge } from '../components/ui/VerifiedBadge';
import { TikTokLoader } from '../components/ui/TikTokLoader';
import { CacheService, CACHE_KEYS } from '../services/cacheService';

export const HomePage: React.FC = () => {
  const { currency } = useCurrency();

  const [categories, setCategories] = useState<Category[]>([]);
  const [mixedFeed, setMixedFeed] = useState<MixedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('Tout');
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll detection to collapse/hide the category bar when scrolling down and restore it at top
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollPosition > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load categories and initial mixed feed (with device cache)
  const loadFeed = async (force: boolean = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      // 1. Fetch categories (with 30 min cache)
      const cats = await CacheService.getOrFetch<Category[]>(
        CACHE_KEYS.CATEGORIES,
        async () => {
          const { data } = await supabase
            .from('categories')
            .select('*')
            .order('display_order', { ascending: true });
          return data || [];
        },
        30 * 60 * 1000,
        force
      );
      setCategories(cats);

      // 2. Fetch intelligent mixed feed (65% videos, 35% products)
      const feed = await RecommendationService.getHomeFeed({
        categorySlug: selectedFilter === 'Tout' ? undefined : selectedFilter,
        forceRefresh: force,
      });

      setMixedFeed(feed);
    } catch (err) {
      console.error('[ManuX Home Feed] Error loading feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed(false);
  }, [selectedFilter]);

  // Subtle filter chips (small, normal text, not heavy black text)
  const filterChips = useMemo(() => {
    const base = ['Tout', 'Vidéos de Démo', 'Nouveautés', 'Formations', 'Logiciels SaaS', 'E-books', 'Templates'];
    if (categories.length > 0) {
      categories.forEach((c) => {
        if (!base.includes(c.name)) base.push(c.name);
      });
    }
    return base;
  }, [categories]);

  // Calculate video & product counts for transparency
  const counts = useMemo(() => {
    const vCount = mixedFeed.filter((i) => i.type === 'video').length;
    const pCount = mixedFeed.filter((i) => i.type === 'product').length;
    return { videos: vCount, products: pCount, total: mixedFeed.length };
  }, [mixedFeed]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SeoHead
        title="ManuX • Découverte de Produits & Vidéos Démo Chariow"
        description="Explorez le flux mixte intelligent ManuX : 65% de vidéos de démonstration et 35% de produits vérifiés issus des boutiques Chariow d’Afrique."
      />

      {/* Collapsible Refined Filter Bar on Scroll (Slides up & disappears when scrolling down, reappears at the top) */}
      <div
        className={`sticky top-16 z-30 bg-white/95 backdrop-blur-md shadow-2xs transition-all duration-300 ease-in-out px-2 sm:px-6 overflow-hidden ${
          isScrolled
            ? '-translate-y-full opacity-0 pointer-events-none max-h-0 py-0 border-b-0 -mb-0'
            : 'translate-y-0 opacity-100 max-h-20 py-2 border-b border-slate-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <HorizontalScrollMenu className="flex-1">
            {filterChips.map((chip) => {
              const isSelected = selectedFilter === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSelectedFilter(chip)}
                  className={`px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </HorizontalScrollMenu>

          {/* Refresh cache button */}
          <button
            type="button"
            onClick={() => loadFeed(true)}
            disabled={refreshing || loading}
            title="Actualiser le flux"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 flex items-center gap-1 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-2 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {/* Promotional Subscription Card (10% discount for first 7 days) */}
        <PromoDiscountCard />

        {/* Feed Header */}
        <div className="flex items-center justify-between gap-2 pt-1 px-1 sm:px-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900">
              Flux Recommandé
            </h1>
          </div>

          {counts.total > 0 && (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60 hidden sm:inline-block">
              {counts.videos} vidéos • {counts.products} produits
            </span>
          )}
        </div>

        {/* UNIFIED MIXED FEED (YouTube Style: Mixed Videos & Products) */}
        {loading ? (
          <div className="py-20 min-h-[50vh] flex items-center justify-center bg-white rounded-2xl border border-slate-200">
            <TikTokLoader size="lg" message="Chargement des vidéos et produits recommandés..." />
          </div>
        ) : mixedFeed.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-900 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Les premiers créateurs et produits arrivent bientôt.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Connectez votre boutique Chariow pour présenter vos produits en vidéo et vendre même pendant que vous dormez.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <a
                href="/auth/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-2xs transition-colors"
              >
                <span>Créer ma vitrine gratuitement</span>
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                <span>Voir les formules</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-5">
            {mixedFeed.map((feedItem) => {
              if (feedItem.type === 'product') {
                return (
                  <HomeProductFeedCard
                    key={`prod_${feedItem.id}`}
                    product={feedItem.item as Product}
                  />
                );
              }

              // Video Item
              const video = feedItem.item as VideoType;
              const creator = video.profile;
              const product = video.product;

              const priceInfo = product
                ? CurrencyService.convert(product.price, product.currency, currency)
                : null;

              const videoThumbnail =
                video.thumbnail_url ||
                (video.youtube_video_id
                  ? `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`
                  : null);

              return (
                <div
                  key={`vid_${video.id}`}
                  className="group flex flex-col bg-transparent rounded-2xl border border-slate-200/70 overflow-hidden hover:shadow-sm transition-all duration-200"
                >
                  {/* Thumbnail with Démo Badge */}
                  <a
                    href={`/videos/${video.slug}`}
                    className="relative aspect-video bg-slate-950 overflow-hidden block"
                  >
                    {videoThumbnail ? (
                      <img
                        src={videoThumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                        <Play className="w-10 h-10 text-slate-500" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/15 group-hover:bg-black/0 transition-colors" />

                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold tracking-wider flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      <span>DÉMO</span>
                    </div>

                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-2xs flex items-center gap-1">
                      <span>Chariow</span>
                    </div>
                  </a>

                  {/* Metadata */}
                  <div className="p-3.5 flex gap-3 flex-1 flex-col justify-between">
                    <div className="flex gap-2.5">
                      <a
                        href={`/creators/${creator?.username || ''}`}
                        className="shrink-0"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                          {creator?.avatar_url ? (
                            <img
                              src={creator.avatar_url}
                              alt={creator.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                              {creator?.display_name?.[0] || 'C'}
                            </div>
                          )}
                        </div>
                      </a>

                      <div className="min-w-0 flex-1">
                        <a
                          href={`/videos/${video.slug}`}
                          className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-amber-600 transition-colors leading-snug"
                        >
                          {video.title}
                        </a>

                        <a
                          href={`/creators/${creator?.username || ''}`}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-800 line-clamp-1 mt-0.5 flex items-center gap-1.5"
                        >
                          <span>{creator?.display_name || 'Créateur ManuX'}</span>
                          {(creator?.is_verified || creator?.subscription_plan === 'creator' || creator?.subscription_plan === 'pro') && (
                            <VerifiedBadge size="sm" />
                          )}
                        </a>
                      </div>
                    </div>

                    {/* Associated Chariow Product & Direct Payment Button */}
                    {product && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            Produit démo
                          </span>
                          <span className="text-xs font-black text-slate-950 truncate block">
                            {priceInfo ? priceInfo.formatted : `${product.price} ${product.currency}`}
                          </span>
                        </div>

                        {product.external_chariow_url ? (
                          <a
                            href={product.external_chariow_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] font-black shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <span>Acheter</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <a
                            href={`/products/${product.slug}`}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[11px] font-bold shrink-0 transition-colors"
                          >
                            Détails
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
