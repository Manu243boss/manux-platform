import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, Video, Globe, ExternalLink, ArrowLeft, Package, MessageSquare, Phone, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile, Product, Video as VideoType, Store, ProfileSocialLink } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { VerifiedBadge } from '../components/ui/VerifiedBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { SeoHead } from '../components/ui/SeoHead';
import { useCurrency } from '../context/CurrencyContext';
import { TikTokLoader } from '../components/ui/TikTokLoader';

export const CreatorProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [socialLinks, setSocialLinks] = useState<ProfileSocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'videos'>('products');
  const { formatPrice } = useCurrency();

  useEffect(() => {
    async function loadCreatorData() {
      if (!username) return;
      try {
        setLoading(true);
        // 1. Fetch profile by username
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (prof) {
          setProfile(prof);

          // Track creator view in analytics
          try {
            await supabase.from('analytics_events').insert({
              event_type: 'creator_view',
              creator_id: prof.id,
            });
          } catch (e) {
            // ignore
          }

          // 2. Fetch creator's products
          const { data: prods } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('user_id', prof.id)
            .eq('status', 'published')
            .order('created_at', { ascending: false });
          if (prods) setProducts(prods);

          // 3. Fetch creator's videos
          const { data: vids } = await supabase
            .from('videos')
            .select('*')
            .eq('user_id', prof.id)
            .eq('status', 'published')
            .order('created_at', { ascending: false });
          if (vids) setVideos(vids);

          // 4. Fetch connected store
          const { data: st } = await supabase
            .from('stores')
            .select('*')
            .eq('user_id', prof.id)
            .maybeSingle();
          if (st) setStore(st);

          // 5. Fetch social links
          const { data: soc } = await supabase
            .from('profile_social_links')
            .select('*')
            .eq('profile_id', prof.id);
          if (soc) setSocialLinks(soc);
        }
      } catch (err) {
        console.error('[ManuX Creator] Error loading creator profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCreatorData();
  }, [username]);

  if (loading) {
    return <TikTokLoader fullScreen message="Chargement de la vitrine créateur..." />;
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Créateur introuvable</h2>
        <p className="text-sm text-slate-500">Le profil @{username} n'existe pas ou n'est pas encore publié.</p>
        <a href="/creators" className="inline-block">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Retourner aux créateurs
          </Button>
        </a>
      </div>
    );
  }

  const creatorJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    'mainEntity': {
      '@type': 'Person',
      'name': profile.display_name || profile.full_name || profile.username,
      'alternateName': `@${profile.username}`,
      'description': profile.bio || `Boutique et catalogue de ${profile.display_name || profile.username} sur ManuX.`,
      'image': profile.avatar_url || undefined,
    },
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
      <SeoHead
        title={`${profile.display_name || `@${profile.username}`} • Boutique & Produits | ManuX Creators`}
        description={profile.bio || `Découvrez la vitrine officielle et les produits Chariow de ${profile.display_name || profile.username} sur ManuX.`}
        image={profile.avatar_url || profile.banner_url || undefined}
        canonical={`https://manux.xttools.site/creators/${profile.username}`}
        type="profile"
        jsonLd={creatorJsonLd}
      />

      {/* Header Banner / Cover */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 h-40 sm:h-64 border border-slate-200/80 shadow-xs">
        {profile.banner_url ? (
          <img src={profile.banner_url} alt="Cover de la vitrine" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 flex items-center justify-center text-slate-400">
            <span className="text-xs tracking-widest uppercase text-white/40 font-bold">
              Vitrine Officielle ManuX
            </span>
          </div>
        )}
      </div>

      {/* Profile Info Bar */}
      <div className="relative px-2 sm:px-6 -mt-14 sm:-mt-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-end gap-3 sm:gap-4">
          <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-white p-1.5 shadow-md border-2 border-slate-200 shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <div className="w-full h-full bg-amber-100 text-amber-950 font-black flex items-center justify-center text-2xl sm:text-3xl rounded-2xl">
                {profile.display_name?.[0] || 'C'}
              </div>
            )}
          </div>

          <div className="pb-1 space-y-0.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-lg sm:text-3xl font-black text-slate-950 font-serif-heading">
                {profile.display_name || profile.full_name}
              </h1>
              {(profile.is_verified || profile.subscription_plan === 'creator' || profile.subscription_plan === 'pro') && (
                <VerifiedBadge size="md" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-bold">@{profile.username}</p>
          </div>
        </div>

        {/* Store link CTA */}
        {store?.external_chariow_url && (
          <a
            href={store.external_chariow_url}
            target="_blank"
            rel="noopener noreferrer"
            className="pb-1"
          >
            <Button variant="chariow" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
              Boutique Chariow officielle
            </Button>
          </a>
        )}
      </div>

      {/* Creator Details (Bio, categories, origin) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {profile.bio && (
            <Card className="p-5 border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                À propos
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            </Card>
          )}

          {/* Tabs: Products vs Videos */}
          <div className="border-b border-slate-200 flex items-center gap-6 pt-2">
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'products'
                  ? 'border-amber-400 text-slate-950'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-4 h-4 text-slate-950" />
              <span>Produits ({products.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'videos'
                  ? 'border-amber-400 text-slate-950'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Video className="w-4 h-4 text-slate-950" />
              <span>Démonstrations vidéo ({videos.length})</span>
            </button>
          </div>

          {/* Products Tab */}
          {activeTab === 'products' && (
            products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {products.map((p) => (
                  <Card key={p.id} hoverable className="overflow-hidden flex flex-col justify-between border-slate-200">
                    <a href={`/products/${p.slug}`} className="block relative aspect-video bg-slate-100">
                      {p.thumbnail_url || p.main_image_url ? (
                        <img src={p.thumbnail_url || p.main_image_url || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </a>
                    <div className="p-3">
                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-2">
                        {p.title}
                      </h4>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-950">
                          {formatPrice(p.price, p.currency).primary}
                        </span>
                        <a href={`/products/${p.slug}`}>
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 font-bold">
                            Voir
                          </Button>
                        </a>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState type="products" title="Ce créateur n'a pas encore publié de produit." />
            )
          )}

          {/* Videos Tab */}
          {activeTab === 'videos' && (
            videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videos.map((v) => (
                  <Card key={v.id} hoverable className="overflow-hidden border-slate-200">
                    <a href={`/videos/${v.slug}`} className="block relative aspect-video bg-slate-900">
                      <img
                        src={v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_video_id}/hqdefault.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </a>
                    <div className="p-3">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2">
                        {v.title}
                      </h4>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState type="videos" title="Aucune vidéo de démonstration publiée par ce créateur." />
            )
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card className="p-5 space-y-3 border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Informations
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600 font-medium">
              {profile.country && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Localisation
                  </span>
                  <span className="font-bold text-slate-900">
                    {profile.city ? `${profile.city}, ` : ''}{profile.country}
                  </span>
                </div>
              )}
              {profile.profile_type && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Type</span>
                  <span className="font-bold text-slate-900 capitalize">{profile.profile_type}</span>
                </div>
              )}
              {profile.primary_category && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Catégorie</span>
                  <Badge variant="category">{profile.primary_category}</Badge>
                </div>
              )}
              {(profile as any).whatsapp_number && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-400 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp
                  </span>
                  <a
                    href={`https://wa.me/${(profile as any).whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Contacter
                  </a>
                </div>
              )}
              {profile.website_url && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Site officiel
                  </span>
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-800 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>Visiter</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
