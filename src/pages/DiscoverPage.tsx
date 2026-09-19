import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  Play,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Video as VideoIcon,
  Package,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Category, Profile } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { CurrencyService } from '../services/currency';
import { SeoHead } from '../components/ui/SeoHead';
import { HorizontalScrollMenu } from '../components/ui/HorizontalScrollMenu';
import { RecommendationService, MixedFeedItem } from '../services/recommendationService';
import { HomeProductFeedCard } from '../components/products/HomeProductFeedCard';
import { VerifiedBadge } from '../components/ui/VerifiedBadge';
import { TikTokLoader } from '../components/ui/TikTokLoader';
import { CacheService, CACHE_KEYS } from '../services/cacheService';

export const DiscoverPage: React.FC = () => {
  const { currency } = useCurrency();

  const [categories, setCategories] = useState<Category[]>([]);
  const [mixedFeed, setMixedFeed] = useState<MixedFeedItem[]>([]);
  const [creators, setCreators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTypeTab, setActiveTypeTab] = useState<'all' | 'videos' | 'products' | 'creators'>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('Tout');

  // Load feed and categories
  const loadDiscoverData = async (force: boolean = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      // 1. Fetch categories
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

      // 2. Fetch creators if needed
      const creatorsData = await CacheService.getOrFetch<Profile[]>(
        'manux_discover_creators_list',
        async () => {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('status', 'published')
            .limit(16);
          return data || [];
        },
        15 * 60 * 1000,
        force
      );
      setCreators(creatorsData);

      // 3. Fetch mixed algorithmic feed (65% videos, 35% products)
      const feed = await RecommendationService.getHomeFeed({
        categorySlug: selectedFilter === 'Tout' ? undefined : selectedFilter,
        forceRefresh: force,
      });

      setMixedFeed(feed);
    } catch (err) {
      console.error('[ManuX Discover] Error loading data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDiscoverData(false);
  }, [selectedFilter]);

  // Filter chips
  const filterChips = useMemo(() => {
    const base = ['Tout', 'Vidéos de Démo', 'Nouveautés', 'Formations', 'Logiciels SaaS', 'E-books', 'Templates'];
    if (categories.length > 0) {
      categories.forEach((c) => {
        if (!base.includes(c.name)) base.push(c.name);
      });
    }
    return base;
  }, [categories]);

  // Filtered feed according to active type tab
  const displayedFeed = useMemo(() => {
    if (activeTypeTab === 'videos') {
      return mixedFeed.filter((item) => item.type === 'video');
    }
    if (activeTypeTab === 'products') {
      return mixedFeed.filter((item) => item.type === 'product');
    }
    return mixedFeed;
  }, [mixedFeed, activeTypeTab]);

  return (
    <div className="min-h-screen bg-slate-50/40 pb-20">
      <SeoHead
        title="Découvrir"
        description="Explorez le flux mixte des démonstrations vidéo, produits Chariow et créateurs africains sur ManuX."
      />

      {/* Top sticky category selector */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Type selector tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTypeTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  activeTypeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tout ({mixedFeed.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTypeTab('videos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                  activeTypeTab === 'videos'
                    ? 'bg-white text-rose-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Démos</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTypeTab('products')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                  activeTypeTab === 'products'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                <span>Produits</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTypeTab('creators')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                  activeTypeTab === 'creators'
                    ? 'bg-white text-amber-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Créateurs</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadDiscoverData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all flex items-center gap-1 text-xs font-semibold"
              title="Actualiser le flux"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>

          {/* Category Chips */}
          <HorizontalScrollMenu
            items={filterChips}
            selectedItem={selectedFilter}
            onSelect={(cat) => setSelectedFilter(cat)}
            className="py-1"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* If Creators Tab Selected */}
        {activeTypeTab === 'creators' ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span>Créateurs & Boutiques Africaines</span>
              </h2>
            </div>

            {creators.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
                Aucun créateur enregistré pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {creators.map((c) => (
                  <Link
                    key={c.id}
                    to={`/creators/${c.username}`}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-400/80 hover:shadow-md transition-all group flex items-center gap-3.5"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-400 font-black text-base flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        c.display_name?.slice(0, 1).toUpperCase() || 'C'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-700">
                          {c.display_name}
                        </h4>
                        {c.is_verified && <VerifiedBadge size="sm" />}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">@{c.username}</p>
                      {c.country && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          📍 {c.country}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Mixed Feed (Products + Videos) */
          <section className="space-y-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <TikTokLoader size="lg" message="Découverte des pépites Chariow..." />
              </div>
            ) : displayedFeed.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200 space-y-3">
                <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">Aucun contenu trouvé dans cette catégorie.</p>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('Tout')}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                >
                  Voir tous les contenus
                </button>
              </div>
            ) : (
              /* Vertically stacked on mobile (1 card per line), grid on desktop */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {displayedFeed.map((item) => {
                  if (item.type === 'video') {
                    const vid = item.data;
                    const thumb =
                      vid.thumbnail_url ||
                      (vid.youtube_video_id
                        ? `https://img.youtube.com/vi/${vid.youtube_video_id}/hqdefault.jpg`
                        : null);
                    const prod = vid.product;
                    const converted = prod
                      ? CurrencyService.convert(prod.price, prod.currency, currency)
                      : null;

                    return (
                      <div
                        key={`vid_${vid.id}`}
                        className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden hover:shadow-lg hover:border-amber-400/80 transition-all duration-300 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Video thumbnail with YouTube embed link */}
                          <Link
                            to={`/videos/${vid.slug}`}
                            className="block relative aspect-video bg-slate-950 overflow-hidden"
                          >
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={vid.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <VideoIcon className="w-10 h-10" />
                              </div>
                            )}

                            {/* Play overlay */}
                            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <div className="w-11 h-11 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                              </div>
                            </div>

                            {/* Video badge */}
                            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              <span>Démo Vidéo</span>
                            </div>
                          </Link>

                          {/* Video metadata */}
                          <div className="px-4 space-y-1.5">
                            <Link to={`/videos/${vid.slug}`}>
                              <h3 className="text-xs sm:text-sm font-bold text-slate-950 line-clamp-2 leading-snug group-hover:text-amber-800 transition-colors">
                                {vid.title}
                              </h3>
                            </Link>

                            {vid.profile && (
                              <Link
                                to={`/creators/${vid.profile.username}`}
                                className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-900 transition-colors"
                              >
                                {vid.profile.avatar_url ? (
                                  <img
                                    src={vid.profile.avatar_url}
                                    alt=""
                                    className="w-4 h-4 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center">
                                    {vid.profile.display_name?.slice(0, 1) || 'C'}
                                  </div>
                                )}
                                <span className="font-semibold truncate max-w-[150px]">
                                  {vid.profile.display_name}
                                </span>
                                {vid.profile.is_verified && <VerifiedBadge size="sm" />}
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Associated Product Banner at bottom if present */}
                        {prod ? (
                          <div className="mt-3 p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                Produit présenté
                              </span>
                              <div className="text-xs font-black text-slate-950 truncate">
                                {converted?.formatted || `${prod.price} ${prod.currency}`}
                              </div>
                            </div>

                            <a
                              href={prod.external_url || `/products/${prod.slug}`}
                              target={prod.external_url ? '_blank' : '_self'}
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                            >
                              <span>Acheter</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="mt-3 p-3 border-t border-slate-100">
                            <Link
                              to={`/videos/${vid.slug}`}
                              className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <span>Voir la démo</span>
                              <Play className="w-3 h-3 fill-slate-800" />
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Product Feed Card
                  return (
                    <HomeProductFeedCard
                      key={`prod_${item.data.id}`}
                      product={item.data}
                      userCurrency={currency}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
