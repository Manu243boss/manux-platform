import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShoppingBag,
  ExternalLink,
  Video,
  CheckCircle2,
  ArrowLeft,
  Share2,
  Store,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, Video as VideoType } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SeoHead } from '../components/ui/SeoHead';
import { VerifiedBadge } from '../components/ui/VerifiedBadge';
import { useCurrency } from '../context/CurrencyContext';
import { CurrencyService } from '../services/currency';
import { RecommendationService } from '../services/recommendationService';
import { CacheService } from '../services/cacheService';
import { AnalyticsService } from '../services/analytics';
import { ProductComments } from '../components/products/ProductComments';
import { ProductRichDescription } from '../components/products/ProductRichDescription';
import { TikTokLoader } from '../components/ui/TikTokLoader';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [associatedVideo, setAssociatedVideo] = useState<VideoType | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<VideoType[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { currency, formatPrice } = useCurrency();

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;
      try {
        setLoading(true);

        // Fetch with CacheService
        const cacheKey = `prod_slug_${slug}`;
        const prod = await CacheService.getOrFetch<Product | null>(
          cacheKey,
          async () => {
            const { data } = await supabase
              .from('products')
              .select('*, profile:profiles(*), category:categories(*), store:stores(*)')
              .eq('slug', slug)
              .single();
            return data as Product | null;
          },
          10 * 60 * 1000
        );

        if (prod) {
          setProduct(prod);

          // Record analytics view asynchronously for both auth & anon users
          AnalyticsService.trackProductView(prod.id, prod.user_id);

          // Fetch associated demo video
          const { data: vid } = await supabase
            .from('videos')
            .select('*')
            .eq('product_id', prod.id)
            .eq('status', 'published')
            .maybeSingle();
          if (vid) setAssociatedVideo(vid);

          // Fetch mixed recommendations (videos and similar products)
          const recs = await RecommendationService.getProductRecommendations(prod.id, prod.category_id);
          setRecommendedVideos(recs.videos);
          setRecommendedProducts(recs.products);
        }
      } catch (err) {
        console.error('[ManuX Product] Error loading product:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  const handleExternalClick = () => {
    if (!product?.external_chariow_url) return;
    AnalyticsService.trackExternalClick(product.id, product.user_id, product.external_chariow_url);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <TikTokLoader fullScreen message="Chargement de la fiche produit..." />;
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Produit introuvable</h2>
        <p className="text-sm text-slate-500">Ce produit n'existe pas ou a été retiré.</p>
        <a
          href="/products"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retourner aux produits</span>
        </a>
      </div>
    );
  }

  const priceInfo = formatPrice(product.price, product.currency);

  // Chariow image priority
  const rawMeta = product.metadata || {};
  const coverImg = rawMeta.pictures?.cover || rawMeta.cover || null;
  const thumbImg = rawMeta.pictures?.thumbnail || product.thumbnail_url || product.main_image_url || null;
  const displayImage = coverImg || thumbImg || null;

  const description = product.description || '';

  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    'name': product.title,
    'image': displayImage ? [displayImage] : undefined,
    'description': description.slice(0, 300) || `Achetez ${product.title} sur Chariow via ManuX.`,
    'offers': {
      '@type': 'Offer',
      'url': product.external_chariow_url || (typeof window !== 'undefined' ? window.location.href : undefined),
      'priceCurrency': product.currency || 'USD',
      'price': product.price || 0,
      'availability': 'https://schema.org/InStock',
    },
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      <SeoHead
        title={`${product.title} • Acheter sur Chariow`}
        description={description.slice(0, 160) || `Achetez ${product.title} sur Chariow via ManuX.`}
        image={displayImage || undefined}
        canonical={`https://manux.xttools.site/products/${product.slug}`}
        type="product"
        jsonLd={productJsonLd}
      />

      {/* Top Back & Share Navigation */}
      <div className="flex items-center justify-between gap-2">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </a>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? 'Lien copié !' : 'Partager'}</span>
        </button>
      </div>

      {/* Primary Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Presentation & Video Player */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Visual Image / Cover */}
          <div className="aspect-video sm:aspect-16/10 bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 relative shadow-xs">
            {displayImage ? (
              <img
                src={displayImage}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-8 text-center">
                <ShoppingBag className="w-16 h-16 text-amber-400/80 mb-3" />
                <span className="text-sm font-semibold text-slate-200">{product.title}</span>
              </div>
            )}

            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
                <span>Boutique Chariow</span>
              </span>
            </div>
          </div>

          {/* Demonstration Video if available */}
          {associatedVideo && (
            <Card className="p-4 sm:p-5 border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-amber-600 fill-amber-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Démonstration vidéo officielle
                  </h3>
                </div>
                <a
                  href={`/videos/${associatedVideo.slug}`}
                  className="text-[11px] font-bold text-amber-800 hover:underline"
                >
                  Voir en grand écran
                </a>
              </div>

              <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner">
                <iframe
                  src={`https://www.youtube.com/embed/${associatedVideo.youtube_video_id}?rel=0`}
                  title={associatedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </Card>
          )}

          {/* Secondary Photo if available (displayed directly below main photo/video) */}
          {(product.secondary_image_url || (product.metadata as any)?.secondary_image_url) && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  Deuxième photo & Aperçu détaillé
                </h3>
              </div>
              <div className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs">
                <img
                  src={product.secondary_image_url || (product.metadata as any)?.secondary_image_url}
                  alt={`${product.title} - Aperçu complémentaire`}
                  className="w-full max-h-[500px] object-contain sm:object-cover bg-slate-950/5"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pricing, Checkout & Creator Info */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border-slate-200/90 shadow-sm space-y-6">
            <div>
              {product.category && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block mb-2">
                  {product.category.name}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight">
                {product.title}
              </h1>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Prix officiel Chariow</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-950 mt-0.5">
                  {priceInfo.primary}
                </div>
              </div>

              {priceInfo.secondary && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Prix original vendeur</span>
                  <span className="text-xs font-bold text-slate-600">
                    {priceInfo.secondary}
                  </span>
                </div>
              )}
            </div>

            {/* Direct Chariow Checkout Action */}
            <div className="space-y-2">
              {(() => {
                const baseStoreUrl = ((product as any).store?.external_chariow_url || '').trim().replace(/\/+$/, '');
                const targetUrl = baseStoreUrl && product.chariow_product_id
                  ? `${baseStoreUrl}/${product.chariow_product_id}`
                  : (product.external_chariow_url || (product.chariow_product_id ? `https://chariow.com/p/${product.chariow_product_id}` : ''));

                return targetUrl ? (
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleExternalClick}
                    className="block w-full"
                  >
                    <Button
                      variant="chariow"
                      size="lg"
                      className="w-full text-sm font-black py-3 rounded-xl shadow-xs"
                      rightIcon={<ExternalLink className="w-4 h-4" />}
                    >
                      Acheter sur Chariow
                    </Button>
                  </a>
                ) : (
                  <Button variant="outline" size="lg" className="w-full" disabled>
                    Lien de commande non disponible
                  </Button>
                );
              })()}
              <p className="text-[11px] text-center text-slate-400">
                Paiement direct et sécurisé sur la boutique officielle Chariow du vendeur
              </p>
            </div>

            {/* Creator Profile Summary */}
            {product.profile && (
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <a
                  href={`/creators/${product.profile.username}`}
                  className="w-11 h-11 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center text-sm shrink-0 overflow-hidden border border-slate-200"
                >
                  {product.profile.avatar_url ? (
                    <img src={product.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    product.profile.display_name?.[0]?.toUpperCase() || 'C'
                  )}
                </a>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`/creators/${product.profile.username}`}
                      className="text-xs sm:text-sm font-bold text-slate-900 truncate hover:text-amber-700 transition-colors"
                    >
                      {product.profile.display_name || product.profile.username}
                    </a>
                    {(product.profile.is_verified || product.profile.subscription_plan === 'creator' || product.profile.subscription_plan === 'pro') && (
                      <VerifiedBadge size="sm" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {product.profile.bio || product.profile.primary_category || 'Boutique Chariow vérifiée'}
                  </p>
                </div>
                <a
                  href={`/creators/${product.profile.username}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  <Store className="w-3.5 h-3.5 text-slate-500" />
                  <span>Vitrine</span>
                </a>
              </div>
            )}

            {/* Product Description with Chariow formatting & Voir plus / Voir moins */}
            {description && (
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans">
                  Description du produit
                </h3>
                <ProductRichDescription content={description} initialSentenceCount={4} />
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Product Interactive Comments Section */}
      <ProductComments productId={product.id} creatorId={product.user_id} />

      {/* BOTTOM SECTION: MIXED RECOMMENDATIONS (VIDEOS + SIMILAR PRODUCTS) */}
      <section className="pt-8 border-t border-slate-200 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="text-base sm:text-lg font-black text-slate-950 font-serif-heading">
            Vous pourriez aussi aimer
          </h2>
        </div>

        {/* Recommended Videos */}
        {recommendedVideos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Démonstrations vidéo associées
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedVideos.map((vid) => {
                const thumb =
                  vid.thumbnail_url ||
                  (vid.youtube_video_id
                    ? `https://img.youtube.com/vi/${vid.youtube_video_id}/hqdefault.jpg`
                    : null);
                return (
                  <a
                    key={vid.id}
                    href={`/videos/${vid.slug}`}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all block"
                  >
                    <div className="aspect-video bg-slate-900 relative overflow-hidden">
                      {thumb && (
                        <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      )}
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        <span>DÉMO</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-amber-700 transition-colors">
                        {vid.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {vid.profile?.display_name || 'Créateur'}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended Similar Products */}
        {recommendedProducts.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-700" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Produits Chariow similaires
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {recommendedProducts.map((p) => {
                const converted = CurrencyService.convert(p.price, p.currency, currency);
                const pImg = p.metadata?.pictures?.cover || p.metadata?.pictures?.thumbnail || p.thumbnail_url || p.main_image_url;
                return (
                  <a
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="group bg-white rounded-xl border border-slate-200 p-2.5 flex flex-col justify-between hover:shadow-xs hover:border-amber-400/80 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="aspect-square rounded-lg bg-slate-100 overflow-hidden relative">
                        {pImg ? (
                          <img src={pImg} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ShoppingBag className="w-6 h-6 text-amber-500/70" />
                          </div>
                        )}
                      </div>
                      <h5 className="text-[11px] font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-amber-700">
                        {p.title}
                      </h5>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-xs font-black text-slate-950">
                        {converted.formatted}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
