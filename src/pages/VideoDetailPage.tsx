import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Play,
  ShoppingBag,
  Store,
  Share2,
  ExternalLink,
  Eye,
  Tag,
  ArrowLeft,
  Video as VideoIcon,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Video, Product } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TikTokComments } from '../components/videos/TikTokComments';
import { VerifiedBadge } from '../components/ui/VerifiedBadge';
import { useCurrency } from '../context/CurrencyContext';
import { TikTokLoader } from '../components/ui/TikTokLoader';

type RecommendationItem =
  | { type: 'video'; data: Video }
  | { type: 'product'; data: Product };

export const VideoDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedProductImg, setSelectedProductImg] = useState<string | null>(null);
  const [mixedRecommendations, setMixedRecommendations] = useState<RecommendationItem[]>([]);

  const { formatPrice } = useCurrency();

  useEffect(() => {
    async function loadVideo() {
      if (!slug) return;
      setLoading(true);

      try {
        const { data: v } = await supabase
          .from('videos')
          .select('*, profile:profiles(*), product:products(*)')
          .eq('slug', slug)
          .single();

        if (v) {
          setVideo(v);

          // SEO metadata update
          document.title = `${v.title} | Démo Vidéo ManuX`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute('content', v.description?.slice(0, 160) || v.title);
          }

          // Track video view
          try {
            await supabase.from('analytics_events').insert({
              event_type: 'video_view',
              video_id: v.id,
              creator_id: v.user_id,
            });
            await supabase.rpc('increment_video_views', { vid: v.id }).maybeSingle();
          } catch {
            // Analytics tracking is non-blocking
          }

          // Fetch recommended videos and products (Targeting 65% videos, 35% products mix)
          const [vidsRes, prodsRes] = await Promise.all([
            supabase
              .from('videos')
              .select('*, profile:profiles(*), product:products(*)')
              .neq('id', v.id)
              .or('status.eq.published,status.is.null,status.eq.active')
              .limit(7),
            supabase
              .from('products')
              .select('*, profile:profiles(*)')
              .or('status.eq.published,status.is.null,status.eq.active')
              .limit(4),
          ]);

          // Mix recommendations: ~65% videos (up to 7) and ~35% products (up to 4)
          const vList = (vidsRes.data || []).map((vd) => ({ type: 'video' as const, data: vd }));
          const pList = (prodsRes.data || []).map((pd) => ({ type: 'product' as const, data: pd }));

          const mixed: RecommendationItem[] = [];
          let vIndex = 0;
          let pIndex = 0;

          // Ratio pattern: 2 videos, 1 product, 2 videos, 1 product (approx 66% / 33%)
          while (vIndex < vList.length || pIndex < pList.length) {
            if (vIndex < vList.length) mixed.push(vList[vIndex++]);
            if (vIndex < vList.length) mixed.push(vList[vIndex++]);
            if (pIndex < pList.length) mixed.push(pList[pIndex++]);
          }

          setMixedRecommendations(mixed.slice(0, 10));
        }
      } catch (err) {
        console.error('[ManuX Video] Error loading video:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVideo();
  }, [slug]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return <TikTokLoader fullScreen message="Chargement de la vidéo..." />;
  }

  if (!video) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-black text-slate-900 font-serif-heading">
          Vidéo introuvable
        </h2>
        <p className="text-xs text-slate-500">
          Cette démonstration vidéo n’existe plus ou a été retirée.
        </p>
        <a
          href="/videos"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Toutes les vidéos démo</span>
        </a>
      </div>
    );
  }

  const product = video.product;

  // Build product gallery
  const productGallery: string[] = [];
  if (product?.thumbnail_url) productGallery.push(product.thumbnail_url);
  if (product?.main_image_url && !productGallery.includes(product.main_image_url)) {
    productGallery.push(product.main_image_url);
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Navigation Bar with Back Arrow */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = '/videos';
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour</span>
        </button>

        <div className="flex items-center gap-2">
          {video.profile?.username && (
            <a
              href={`/creators/${video.profile.username}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950"
            >
              <Store className="w-3.5 h-3.5 text-amber-500" />
              <span>{video.profile.display_name || video.profile.username}</span>
              {(video.profile.is_verified || video.profile.subscription_plan === 'creator' || video.profile.subscription_plan === 'pro') && (
                <VerifiedBadge size="sm" />
              )}
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Main Content: Player, Product Highlights, Comments, and Mobile Full-Screen Recommendations */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4 sm:space-y-5">
          {/* Responsive YouTube Embed Container */}
          <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-md bg-black relative border border-slate-800">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?autoplay=0&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>

          {/* Video Title & Author Row */}
          <div className="space-y-3">
            <h1 className="text-base sm:text-xl font-black text-slate-900 font-serif-heading tracking-tight leading-snug">
              {video.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-slate-100 pb-3">
              {/* Creator Info */}
              {video.profile && (
                <a
                  href={`/creators/${video.profile.username}`}
                  className="flex items-center gap-2.5 group"
                >
                  {video.profile.avatar_url ? (
                    <img
                      src={video.profile.avatar_url}
                      alt={video.profile.display_name || ''}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center">
                      {video.profile.display_name?.slice(0, 1).toUpperCase() || 'C'}
                    </div>
                  )}
                  <div>
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      <span>{video.profile.display_name || video.profile.username}</span>
                      {(video.profile.is_verified || video.profile.subscription_plan === 'creator' || video.profile.subscription_plan === 'pro') && (
                        <VerifiedBadge size="sm" />
                      )}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      @{video.profile.username}
                    </span>
                  </div>
                </a>
              )}

              {/* Views & Share */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-slate-400 text-xs px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-bold text-slate-700">{video.views_count || 0}</span>
                </div>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{copied ? 'Lien copié !' : 'Partager'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Details Section: 2 Images, Description, Chariow Direct Link, Visit Store */}
          {product && (
            <Card className="p-4 sm:p-5 border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-emerald-50/20 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-amber-100/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                    Produit présenté
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {product.title}
                  </span>
                </div>
                <span className="text-xs font-black text-amber-950">
                  {formatPrice(product.price, product.currency).primary}
                </span>
              </div>

              {/* 2-Image Gallery + Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                {/* Product Images (up to 2 preview images) */}
                <div className="sm:col-span-5 space-y-2">
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={selectedProductImg || productGallery[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {productGallery.length > 1 && (
                    <div className="flex gap-2">
                      {productGallery.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedProductImg(img)}
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            (selectedProductImg || productGallery[0]) === img
                              ? 'border-amber-500 ring-2 ring-amber-200'
                              : 'border-slate-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Description & Direct CTAs */}
                <div className="sm:col-span-7 space-y-3 flex flex-col justify-between h-full">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] font-bold text-slate-600">
                        {product.category || 'Produit Numérique'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                      {product.description || 'Retrouvez ce produit complet directement disponible sur la boutique officielle Chariow.'}
                    </p>
                  </div>

                  {/* Dual Action Buttons: Acheter sur Chariow & Visiter la boutique */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    {product.external_chariow_url ? (
                      <a
                        href={product.external_chariow_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-2xs transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Acheter sur Chariow</span>
                        <ExternalLink className="w-3 h-3 text-slate-700" />
                      </a>
                    ) : (
                      <a
                        href={`/products/${product.slug}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-2xs transition-colors"
                      >
                        <span>Voir la fiche</span>
                      </a>
                    )}

                    {video.profile?.username && (
                      <a
                        href={`/creators/${video.profile.username}`}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <Store className="w-3.5 h-3.5 text-slate-500" />
                        <span>Boutique</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Video Description Box */}
          {video.description && (
            <Card className="p-4 sm:p-5 border-slate-200/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Détails de la démonstration
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {video.description}
              </p>
            </Card>
          )}

          {/* TikTok Style Threaded Comments Component */}
          <TikTokComments videoId={video.id} creatorId={video.user_id} />

          {/* MOBILE ONLY: Full-Screen Feed Recommendations (YouTube Home Style) */}
          <div className="block lg:hidden space-y-3 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-sm font-extrabold text-slate-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Recommandations pour vous</span>
              </h2>
              <span className="text-[10px] text-slate-400">ManuX Feed</span>
            </div>

            <div className="space-y-3">
              {mixedRecommendations.map((item) => {
                if (item.type === 'video') {
                  const rec = item.data;
                  return (
                    <a
                      key={`mob_rec_v_${rec.id}`}
                      href={`/videos/${rec.slug}`}
                      className="block bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
                    >
                      <div className="aspect-video bg-slate-900 relative overflow-hidden">
                        <img
                          src={rec.thumbnail_url || `https://img.youtube.com/vi/${rec.youtube_video_id}/hqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/80 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                          <Play className="w-3 h-3 fill-amber-400" />
                          <span>DÉMO</span>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="flex items-start gap-2.5">
                          {rec.profile?.avatar_url ? (
                            <img src={rec.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-950 font-bold flex items-center justify-center text-xs shrink-0">
                              {rec.profile?.display_name?.[0] || 'C'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                              {rec.title}
                            </h4>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                              <span className="truncate">{rec.profile?.display_name || rec.profile?.username}</span>
                              {(rec.profile?.is_verified || rec.profile?.subscription_plan === 'creator' || rec.profile?.subscription_plan === 'pro') && (
                                <VerifiedBadge size="sm" />
                              )}
                              <span>•</span>
                              <span>{rec.views_count || 0} vues</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                } else {
                  const prod = item.data;
                  return (
                    <a
                      key={`mob_rec_p_${prod.id}`}
                      href={`/products/${prod.slug}`}
                      className="block bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
                    >
                      <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        <img
                          src={prod.thumbnail_url || prod.main_image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" />
                          <span>CHARIOW</span>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                            {prod.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {prod.profile?.display_name || prod.profile?.username || 'Boutique Chariow'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-amber-950">
                            {formatPrice(prod.price, prod.currency).primary}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                }
              })}
            </div>
          </div>
        </div>

        {/* DESKTOP ONLY Right Sidebar: Large YouTube-Style Recommendations */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Recommandations pour vous</span>
            </h2>
            <span className="text-[10px] text-slate-400">ManuX Engine</span>
          </div>

          {mixedRecommendations.length > 0 ? (
            <div className="space-y-3">
              {mixedRecommendations.map((item) => {
                if (item.type === 'video') {
                  const rec = item.data;
                  return (
                    <a
                      key={`rec_v_${rec.id}`}
                      href={`/videos/${rec.slug}`}
                      className="flex gap-3 p-2 rounded-2xl hover:bg-slate-100/90 transition-all group block bg-white border border-slate-200/60 shadow-2xs"
                    >
                      <div className="w-40 sm:w-44 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0 relative shadow-2xs">
                        <img
                          src={rec.thumbnail_url || `https://img.youtube.com/vi/${rec.youtube_video_id}/hqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-slate-950/80 text-amber-400 flex items-center justify-center shadow-xs">
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/80 text-white text-[9px] font-bold">
                          DÉMO
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              <VideoIcon className="w-2.5 h-2.5 text-amber-600" />
                              Vidéo
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors leading-snug">
                            {rec.title}
                          </h4>
                        </div>
                        {rec.profile && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mt-1">
                            <span className="truncate">{rec.profile.display_name || rec.profile.username}</span>
                            {(rec.profile.is_verified || rec.profile.subscription_plan === 'creator' || rec.profile.subscription_plan === 'pro') && (
                              <VerifiedBadge size="sm" />
                            )}
                          </div>
                        )}
                      </div>
                    </a>
                  );
                } else {
                  const prod = item.data;
                  return (
                    <a
                      key={`rec_p_${prod.id}`}
                      href={`/products/${prod.slug}`}
                      className="flex gap-3 p-2 rounded-2xl hover:bg-slate-100/90 transition-all group block bg-white border border-slate-200/60 shadow-2xs"
                    >
                      <div className="w-40 sm:w-44 aspect-video rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60 relative shadow-2xs">
                        <img
                          src={prod.thumbnail_url || prod.main_image_url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute top-1 right-1">
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[9px] shadow-xs flex items-center gap-0.5">
                            <ShoppingBag className="w-2.5 h-2.5" />
                            CHARIOW
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-950">
                              Produit
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-amber-600 leading-snug">
                            {prod.title}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                          <span className="text-xs font-black text-amber-950">
                            {formatPrice(prod.price, prod.currency).primary}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                }
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-2xl text-center">
              Recommandations en cours de calcul...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
