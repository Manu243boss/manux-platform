import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Filter, ShoppingBag, ExternalLink, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SeoHead } from '../components/ui/SeoHead';
import { useCurrency } from '../context/CurrencyContext';
import { AnalyticsService } from '../services/analytics';
import { useAuth } from '../context/AuthContext';
import { TikTokLoader } from '../components/ui/TikTokLoader';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useCurrency();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        // Load categories
        const { data: cats } = await supabase.from('categories').select('*').order('name');
        if (cats) setCategories(cats);

        // Query products
        let query = supabase
          .from('products')
          .select('*, profile:profiles(*), category:categories(*)')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (selectedCategory !== 'all') {
          query = query.eq('category_id', selectedCategory);
        }

        const { data: prods } = await query;
        if (prods) setProducts(prods);
      } catch (err) {
        console.error('[ManuX Products] Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [selectedCategory]);

  if (loading) {
    return <TikTokLoader fullScreen message="Chargement des produits Chariow..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <SeoHead
        title="Tous les Produits Chariow - ManuX"
        description="Catalogue complet des produits Chariow présentés par les créateurs ManuX : formations, e-books, logiciels et créations avec redirection directe vers le paiement sécurisé."
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/80 pb-4 sm:pb-5">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-950 font-serif-heading">
            Tous les Produits & Formations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Découvrez les créations vérifiées et achetez directement sur la page de paiement sécurisée Chariow.
          </p>
        </div>

        {/* Categories selector */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium'
              }`}
            >
              Tous ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === c.id
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
          {products.map((product) => {
            const priceInfo = formatPrice(product.price, product.currency);
            return (
              <Card key={product.id} hoverable className="overflow-hidden flex flex-col justify-between group border-slate-200">
                <a
                  href={product.external_chariow_url || `/products/${product.slug}`}
                  target={product.external_chariow_url ? '_blank' : undefined}
                  rel={product.external_chariow_url ? 'noopener noreferrer' : undefined}
                  className="block relative aspect-video bg-slate-100 overflow-hidden"
                >
                  {product.thumbnail_url || product.main_image_url ? (
                    <img
                      src={product.thumbnail_url || product.main_image_url || ''}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                  {product.external_chariow_url && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="chariow" size="sm">
                        Chariow
                      </Badge>
                    </div>
                  )}
                </a>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {product.category && (
                      <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">
                        {product.category.name}
                      </span>
                    )}
                    <a
                      href={product.external_chariow_url || `/products/${product.slug}`}
                      target={product.external_chariow_url ? '_blank' : undefined}
                      rel={product.external_chariow_url ? 'noopener noreferrer' : undefined}
                      className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-amber-600 transition-colors block"
                    >
                      {product.title}
                    </a>
                    {product.profile && (
                      <a
                        href={`/creators/${product.profile.username}`}
                        className="text-[11px] text-slate-500 hover:text-slate-800 line-clamp-1 mt-1 block font-medium"
                      >
                        Par {product.profile.display_name || product.profile.username}
                      </a>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs sm:text-sm font-black text-slate-950">
                        {priceInfo.primary}
                      </div>
                      {priceInfo.secondary && (
                        <div className="text-[10px] text-slate-400">
                          {priceInfo.secondary}
                        </div>
                      )}
                    </div>

                    {product.external_chariow_url ? (
                      <a
                        href={product.external_chariow_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          AnalyticsService.logEvent({
                            eventType: 'external_click',
                            productId: product.id,
                            creatorId: product.user_id,
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] font-black shadow-2xs transition-colors shrink-0"
                      >
                        <span>Acheter</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <a
                        href={`/products/${product.slug}`}
                        className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[11px] font-bold shrink-0 transition-colors"
                      >
                        Détails
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          type="products"
          title="Aucun produit pour le moment."
          description="Aucun produit n'a encore été publié dans cette catégorie."
          actionText="Ajouter un produit"
          actionHref="/onboarding"
        />
      )}
    </div>
  );
};
