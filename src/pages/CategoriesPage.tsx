import React, { useEffect, useState } from 'react';
import { Grid, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { Card } from '../components/ui/Card';
import { SeoHead } from '../components/ui/SeoHead';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true });

        if (data) setCategories(data);
      } catch (err) {
        console.error('[ManuX] Error loading categories:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SeoHead
        title="Toutes les Catégories de Produits - ManuX"
        description="Parcourez les produits et formations par catégorie : formations, logiciels, e-books, templates, artisanat et business."
      />

      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 font-serif-heading">
          Catégories de Produits & Formations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Explorez les offres selon vos besoins d'apprentissage, outils de travail ou projets
        </p>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => (
            <a key={cat.id} href={`/category/${cat.slug}`} className="block group">
              <Card hoverable className="p-5 flex items-start gap-4 border-slate-200">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/60 flex items-center justify-center shrink-0 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                  <Grid className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      {cat.name}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  {cat.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>
              </Card>
            </a>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-xs">Chargement des catégories...</p>
        </Card>
      )}
    </div>
  );
};
