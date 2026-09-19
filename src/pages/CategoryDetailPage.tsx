import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Category, Product } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SeoHead } from '../components/ui/SeoHead';
import { useCurrency } from '../context/CurrencyContext';

export const CategoryDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    async function loadCategoryProducts() {
      if (!slug) return;
      try {
        setLoading(true);
        const { data: cat } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug)
          .single();

        if (cat) {
          setCategory(cat);

          const { data: prods } = await supabase
            .from('products')
            .select('*, profile:profiles(*)')
            .eq('category_id', cat.id)
            .eq('status', 'published');

          if (prods) setProducts(prods);
        }
      } catch (err) {
        console.error('[ManuX Category] Error loading category products:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCategoryProducts();
  }, [slug]);

  if (!category && !loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Catégorie introuvable</h2>
        <Link to="/categories">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Voir les catégories
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SeoHead
        title={category?.name || 'Catégorie'}
        description={category?.description || `Explorez tous les produits de la catégorie ${category?.name} sur ManuX.`}
      />

      <div className="border-b border-slate-200/80 pb-5">
        <Link to="/categories" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Toutes les catégories</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif-heading">
          {category?.name}
        </h1>
        {category?.description && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {category.description}
          </p>
        )}
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card key={product.id} hoverable className="overflow-hidden flex flex-col justify-between">
              <Link to={`/products/${product.slug}`} className="block relative aspect-video bg-slate-100">
                {product.thumbnail_url || product.main_image_url ? (
                  <img src={product.thumbnail_url || product.main_image_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package className="w-8 h-8" />
                  </div>
                )}
              </Link>
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2">
                  {product.title}
                </h3>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-950">
                    {formatPrice(product.price, product.currency).primary}
                  </span>
                  <Link to={`/products/${product.slug}`}>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2">
                      Voir
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          type="products"
          title={`Aucun produit dans « ${category?.name} » pour le moment.`}
          description="Soyez le premier à ajouter un produit dans cette catégorie."
          actionText="Ajouter un produit"
          actionHref="/onboarding"
        />
      )}
    </div>
  );
};
