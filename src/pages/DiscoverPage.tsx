import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Sparkles, Filter, Package, Video, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, Video as VideoType, Profile } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SeoHead } from '../components/ui/SeoHead';

export const DiscoverPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'videos' | 'creators'>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [creators, setCreators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDiscover() {
      try {
        setLoading(true);
        const [pRes, vRes, cRes] = await Promise.all([
          supabase.from('products').select('*, category:categories(*)').eq('status', 'published').limit(12),
          supabase.from('videos').select('*, product:products(*)').eq('status', 'published').limit(8),
          supabase.from('profiles').select('*').eq('status', 'published').limit(8),
        ]);

        if (pRes.data) setProducts(pRes.data);
        if (vRes.data) setVideos(vRes.data);
        if (cRes.data) setCreators(cRes.data);
      } catch (err) {
        console.error('[ManuX Discover] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDiscover();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SeoHead
        title="Découvrir"
        description="Explorez les créations, formations et produits africains présentés en vidéo sur ManuX."
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif-heading">
            Centre de Découverte
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Naviguez à travers l'écosystème de produits, vidéos de démonstration et créateurs
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tout
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'products' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Produits
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'videos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vidéos
          </button>
          <button
            onClick={() => setActiveTab('creators')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'creators' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Créateurs
          </button>
        </div>
      </div>

      {/* Products Section */}
      {(activeTab === 'all' || activeTab === 'products') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Produits récents</span>
            </h2>
            <Link to="/products" className="text-xs text-emerald-700 font-semibold hover:underline">
              Voir tous les produits ({products.length})
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <Card key={p.id} hoverable className="overflow-hidden flex flex-col justify-between">
                  <Link to={`/products/${p.slug}`} className="block relative aspect-video bg-slate-100">
                    {p.thumbnail_url || p.main_image_url ? (
                      <img src={p.thumbnail_url || p.main_image_url || ''} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </Link>
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2">
                      {p.title}
                    </h3>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {p.price} {p.currency}
                      </span>
                      <Link to={`/products/${p.slug}`}>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5">
                          Consulter
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState type="products" title="Aucun produit pour le moment." />
          )}
        </section>
      )}

      {/* Videos Section */}
      {(activeTab === 'all' || activeTab === 'videos') && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-600" />
              <span>Démonstrations en vidéo</span>
            </h2>
            <Link to="/videos" className="text-xs text-emerald-700 font-semibold hover:underline">
              Toutes les vidéos ({videos.length})
            </Link>
          </div>

          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((v) => (
                <Card key={v.id} hoverable className="overflow-hidden">
                  <Link to={`/videos/${v.slug}`} className="block relative aspect-video bg-slate-900">
                    <img
                      src={v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_video_id}/hqdefault.jpg`}
                      alt={v.title}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="p-3.5">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2">
                      {v.title}
                    </h3>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState type="videos" title="Aucune vidéo disponible." />
          )}
        </section>
      )}

      {/* Creators Section */}
      {(activeTab === 'all' || activeTab === 'creators') && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Créateurs & Boutiques</span>
            </h2>
            <Link to="/creators" className="text-xs text-emerald-700 font-semibold hover:underline">
              Annuaire complet ({creators.length})
            </Link>
          </div>

          {creators.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {creators.map((c) => (
                <Link key={c.id} to={`/creators/${c.username}`}>
                  <Card hoverable className="p-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg mx-auto mb-2 overflow-hidden border border-emerald-200/60">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        c.display_name?.[0] || 'C'
                      )}
                    </div>
                    <h3 className="text-xs font-semibold text-slate-900 truncate">{c.display_name}</h3>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState type="creators" title="Les premiers créateurs arrivent bientôt." />
          )}
        </section>
      )}
    </div>
  );
};
