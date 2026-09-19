import React from 'react';
import { ShoppingBag, ExternalLink, ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { CurrencyService } from '../../services/currency';
import { AnalyticsService } from '../../services/analytics';
import { VerifiedBadge } from '../ui/VerifiedBadge';

interface HomeProductFeedCardProps {
  product: Product;
}

export const HomeProductFeedCard: React.FC<HomeProductFeedCardProps> = ({ product }) => {
  const { currency } = useCurrency();

  const creator = product.profile;
  const priceInfo = CurrencyService.convert(product.price, product.currency, currency);

  // Chariow official image priority:
  // 1. pictures.cover
  // 2. pictures.thumbnail / main_image_url
  // 3. fallback placeholder
  const rawMeta = product.metadata || {};
  const coverImg = rawMeta.pictures?.cover || rawMeta.cover || null;
  const thumbImg = rawMeta.pictures?.thumbnail || product.thumbnail_url || product.main_image_url || null;
  const displayImage = coverImg || thumbImg || null;

  const handleProductClick = () => {
    AnalyticsService.trackProductClick(product.id, product.user_id);
  };

  const handleExternalClick = () => {
    AnalyticsService.trackExternalClick(product.id, product.user_id, product.external_chariow_url);
  };

  return (
    <div className="group flex flex-col bg-transparent rounded-2xl border border-slate-200/70 overflow-hidden hover:shadow-sm transition-all duration-200 justify-between">
      {/* Visual Product Image with Clean Chariow Badge & Price Tag */}
      <div>
        <a
          href={`/products/${product.slug}`}
          onClick={handleProductClick}
          className="relative aspect-video bg-slate-950 overflow-hidden block"
        >
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center">
              <ShoppingBag className="w-10 h-10 text-amber-400/80 mb-1" />
              <span className="text-xs font-semibold text-slate-300 line-clamp-1">{product.title}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-black/15 group-hover:bg-black/0 transition-colors pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
              <ShoppingBag className="w-2.5 h-2.5 text-slate-950" />
              <span>Chariow</span>
            </span>
          </div>

          {/* Price Tag Overlay on Thumbnail */}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[11px] font-black shadow-xs backdrop-blur-xs flex items-center gap-1">
            <span className="text-amber-400">{priceInfo ? priceInfo.formatted : `${product.price} ${product.currency}`}</span>
          </div>
        </a>

        {/* Header Info: Creator Avatar + Title */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-start gap-2.5">
            <a
              href={`/creators/${creator?.username || ''}`}
              className="shrink-0"
              title={creator?.display_name || 'Créateur'}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 mt-0.5">
                {creator?.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                    {creator?.display_name?.[0] || 'C'}
                  </div>
                )}
              </div>
            </a>

            <div className="min-w-0 flex-1">
              <a
                href={`/products/${product.slug}`}
                onClick={handleProductClick}
                className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-amber-600 transition-colors leading-snug"
              >
                {product.title}
              </a>

              <a
                href={`/creators/${creator?.username || ''}`}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 line-clamp-1 mt-0.5 flex items-center gap-1.5"
              >
                <span>{creator?.display_name || 'Boutique Chariow'}</span>
                {(creator?.is_verified || creator?.subscription_plan === 'creator' || creator?.subscription_plan === 'pro') && (
                  <VerifiedBadge size="sm" />
                )}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: Direct Chariow Checkout + Product Details */}
      <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-black text-slate-950">
              {product.price > 0 ? `${product.price.toLocaleString()} ${product.currency}` : 'Gratuit'}
            </span>
            {priceInfo && currency !== product.currency && (
              <span className="text-[10px] text-slate-600 font-medium hidden sm:inline">
                (≈ {priceInfo.formatted})
              </span>
            )}
          </div>
          <a
            href={`/products/${product.slug}`}
            onClick={handleProductClick}
            className="text-[10px] font-bold text-slate-600 hover:text-slate-950 flex items-center gap-0.5"
          >
            <span>Détails</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </a>
        </div>

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
              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] font-black shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
            >
              <span>Acheter</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <a
              href={`/products/${product.slug}`}
              onClick={handleProductClick}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[11px] font-bold shrink-0 transition-colors"
            >
              Voir
            </a>
          );
        })()}
      </div>
    </div>
  );
};
