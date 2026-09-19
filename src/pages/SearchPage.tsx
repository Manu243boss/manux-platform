import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, Video, Users, ArrowRight, ExternalLink, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, Video as VideoType, Profile } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SeoHead } from '../components/ui/SeoHead';
import { TikTokLoader } from '../components/ui/TikTokLoader';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [creators, setCreators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce user input so as they type, search starts automatically without pressing Enter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Execute search whenever debounced query changes
  useEffect(() => {
    async function executeSearch() {
      if (!debouncedQuery) {
        setProducts([]);
        setVideos([]);
        setCreators([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const term = `%${debouncedQuery}%`;

        // Search products, videos and creator profiles in parallel
        const [pRes, vRes, cRes] = await Promise.all([
          supabase
            .from('products')
            .select('*, profile:profiles(*)')
            .ilike('title', term)
            .eq('status', 'published')
            .limit(18),
          supabase
            .from('videos')
            .select('*, profile:profiles(*)')
            .ilike('title', term)
            .eq('status', 'published')
            .limit(12),
          supabase
            .from('profiles')
            .select('*')
            .or(`display_name.ilike.${term},username.ilike.${term}`)
            .limit(12),
        ]);

        if (pRes.data) setProducts(pRes.data);
        if (vRes.data) setVideos(vRes.data);
        if (cRes.data) setCreators(cRes.data);
      } catch (err) {
        console.error('[ManuX Search] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    executeSearch();
  }, [debouncedQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setDebouncedQuery('');
    setSearchParams({});
    setProducts([]);
    setVideos([]);
    setCreators([]);
  };

  const totalResults = products.length + videos.length + creators.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SeoHead
        title={debouncedQuery ? `Recherche : ${debouncedQuery} - ManuX` : 'Recherche - ManuX'}
        description="Recherchez des produits, des créateurs ou des démonstrations vidéo sur ManuX avec redirection directe vers les boutiques Chariow."
      />

      {/* Live As-You-Type Search Input Bar */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="relative flex items-center shadow-xs rounded-2xl bg-white border border-slate-200 p-1.5 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
          <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tapez un titre, nom de compte ou profil..."
            className="w-full px-3 py-2 text-xs sm:text-sm text-slate-900 bg-transparent outline-none font-medium"
            autoFocus
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-700 mr-2 transition-colors cursor-pointer"
              title="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="rounded-xl px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shrink-0 transition-colors shadow-2xs cursor-pointer"
          >
            Rechercher
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-slate-600 px-3 pt-2 font-medium">
          <span>Recherche instantanée dès la saisie (sans avoir besoin d'appuyer sur Entrée)</span>
          {loading && <span className="text-amber-800 font-bold animate-pulse">Chargement en direct...</span>}
        </div>
      </div>

      {debouncedQuery && (
        <div className="border-b border-slate-100 pb-3 text-xs text-slate-500 flex items-center justify-between">
          <div>
            Résultats pour <span className="font-bold text-slate-900">« {debouncedQuery} »</span> : {totalResults} résultat(s)
          </div>
        </div>
      )}

      {/* Loading state using TikTokLoader */}
      {loading && (
        <div className="py-12">
          <TikTokLoader size="md" message="Recherche en direct sur ManuX..." />
        </div>
      )}

      {/* Results Section */}
      {!loading && debouncedQuery ? (
        totalResults > 0 ? (
          <div className="space-y-8">
            {/* Products results */}
            {products.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Produits & Formations ({products.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((p) => (
                    <Card key={p.id} hoverable className="p-3.5 border-slate-200 flex flex-col justify-between">
                      <div>
                        <a
                          href={p.external_chariow_url || `/products/${p.slug}`}
                          target={p.external_chariow_url ? '_blank' : undefined}
                          rel={p.external_chariow_url ? 'noopener noreferrer' : undefined}
                          className="text-xs font-bold text-slate-900 hover:text-amber-600 line-clamp-1 block"
                        >
                          {p.title}
                        </a>
                        <p className="text-xs font-black text-amber-950 mt-1">{p.price} {p.currency}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <a href={`/products/${p.slug}`} className="text-[11px] text-slate-500 hover:text-slate-800">
                          Fiche produit
                        </a>
                        {p.external_chariow_url && (
                          <a
                            href={p.external_chariow_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 transition-colors shadow-2xs"
                          >
                            <span>Paiement Chariow</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Videos results */}
            {videos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Video className="w-4 h-4 text-emerald-600" />
                  <span>Vidéos de Démonstration ({videos.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {videos.map((v) => (
                    <a key={v.id} href={`/videos/${v.slug}`}>
                      <Card hoverable className="p-3 border-slate-200">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{v.title}</h4>
                        <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">Regarder la démo →</span>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Creators results */}
            {creators.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Créateurs ({creators.length})</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {creators.map((c) => (
                    <a key={c.id} href={`/creators/${c.username}`}>
                      <Card hoverable className="p-3 flex items-center gap-3 border-slate-200">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center text-xs shrink-0">
                          {c.display_name?.[0] || 'C'}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{c.display_name}</h4>
                          <p className="text-[10px] text-slate-400">@{c.username}</p>
                        </div>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="Aucun résultat trouvé."
            description={`Aucun produit, créateur ou vidéo ne correspond à « ${debouncedQuery} ». Essayez un autre mot-clé.`}
          />
        )
      ) : (
        <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
          Saisissez un mot-clé pour lancer une recherche instantanée sur ManuX.
        </div>
      )}
    </div>
  );
};
