import React, { useEffect, useState, useMemo } from 'react';
import { Video as VideoIcon, Play, ShoppingBag, CheckCircle2, Sparkles, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Video as VideoType, Category } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SeoHead } from '../components/ui/SeoHead';
import { useCurrency } from '../context/CurrencyContext';
import { HorizontalScrollMenu } from '../components/ui/HorizontalScrollMenu';
import { TikTokLoader } from '../components/ui/TikTokLoader';

export const VideosPage: React.FC = () => {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tout');
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    async function loadVideosAndCats() {
      try {
        setLoading(true);
        const [vidsRes, catsRes] = await Promise.all([
          supabase
            .from('videos')
            .select('*, profile:profiles(*), product:products(*)')
            .eq('status', 'published')
            .order('created_at', { ascending: false }),
          supabase.from('categories').select('*').order('display_order', { ascending: true }),
        ]);

        if (vidsRes.data) setVideos(vidsRes.data);
        if (catsRes.data) setCategories(catsRes.data);
      } catch (err) {
        console.error('[ManuX Videos] Error loading videos:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVideosAndCats();
  }, []);

  // Category filters list
  const categoryFilters = useMemo(() => {
    const list = ['Tout', 'Populaire', 'Formations', 'Logiciels SaaS', 'E-books', 'Templates', 'Physique'];
    if (categories.length > 0) {
      categories.forEach((c) => {
        if (!list.includes(c.name)) list.push(c.name);
      });
    }
    return list;
  }, [categories]);

  // Filtered list
  const filteredVideos = useMemo(() => {
    if (selectedCategory === 'Tout') return videos;
    if (selectedCategory === 'Populaire') {
      return [...videos].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    }
    return videos.filter((v) => {
      const titleMatch = v.title.toLowerCase().includes(selectedCategory.toLowerCase());
      const descMatch = v.description?.toLowerCase().includes(selectedCategory.toLowerCase());
      return titleMatch || descMatch;
    });
  }, [videos, selectedCategory]);

  if (loading) {
    return <TikTokLoader fullScreen message="Chargement des démonstrations vidéo..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <SeoHead
        title="Démonstrations Vidéo • ManuX"
        description="Regardez les démonstrations vidéo des produits et formations créés par les entrepreneurs africains."
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 font-serif-heading">
            Démonstrations Vidéo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualisez concrètement ce que chaque produit offre avant de commander sur Chariow.
          </p>
        </div>

        <a href="/dashboard/videos">
          <Button variant="chariow" size="sm" leftIcon={<VideoIcon className="w-3.5 h-3.5" />}>
            Publier une vidéo démo
          </Button>
        </a>
      </div>

      {/* Horizontal Scroll Filter Bar with Left & Right Arrows */}
      <div className="py-1">
        <HorizontalScrollMenu className="w-full">
          {categoryFilters.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </HorizontalScrollMenu>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-2xl border border-slate-100 p-3 space-y-3 animate-pulse bg-white">
              <div className="aspect-video bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5">
          {filteredVideos.map((video) => (
            <Card key={video.id} hoverable className="overflow-hidden flex flex-col justify-between group border-slate-200">
              <a href={`/videos/${video.slug}`} className="block relative aspect-video bg-slate-950 overflow-hidden">
                <img
                  src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 ml-0.5 fill-current text-slate-950" />
                  </div>
                </div>

                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">
                  DÉMO
                </div>

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-bold shadow-2xs">
                  Chariow
                </div>
              </a>

              <div className="p-3.5 space-y-2">
                <a href={`/videos/${video.slug}`}>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-amber-800 transition-colors">
                    {video.title}
                  </h3>
                </a>

                {/* Creator info */}
                {video.profile && (
                  <a
                    href={`/creators/${video.profile.username}`}
                    className="flex items-center gap-2 group/author pt-1"
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      {video.profile.avatar_url ? (
                        <img src={video.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-amber-200 text-amber-900 flex items-center justify-center text-[9px] font-black">
                          {video.profile.display_name?.[0] || 'C'}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 group-hover/author:text-slate-950 truncate">
                      {video.profile.display_name || video.profile.username}
                    </span>
                  </a>
                )}

                {/* Associated Product CTA if attached */}
                {video.product && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Produit présenté</span>
                      <span className="text-xs font-black text-slate-950 truncate block">
                        {formatPrice(video.product.price, video.product.currency).primary}
                      </span>
                    </div>

                    <a
                      href={video.product.external_chariow_url || `/products/${video.product.slug}`}
                      target={video.product.external_chariow_url ? '_blank' : undefined}
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2.5 font-bold" leftIcon={<ShoppingBag className="w-3 h-3 text-slate-950" />}>
                        Voir l'offre
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          type="videos"
          title="Aucune vidéo de démonstration trouvée."
          description="Soyez le premier à ajouter la vidéo de présentation de votre produit Chariow !"
          actionLabel="Ajouter une vidéo YouTube"
          actionPath="/dashboard/videos"
        />
      )}
    </div>
  );
};
