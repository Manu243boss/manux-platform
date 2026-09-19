import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ShoppingBag, Video, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { VerifiedBadge } from '../components/ui/VerifiedBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { SeoHead } from '../components/ui/SeoHead';
import { TikTokLoader } from '../components/ui/TikTokLoader';

export const CreatorsPage: React.FC = () => {
  const [creators, setCreators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCreators() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (data) setCreators(data);
      } catch (err) {
        console.error('[ManuX Creators] Error loading creators:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCreators();
  }, []);

  if (loading) {
    return <TikTokLoader fullScreen message="Chargement des créateurs ManuX..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <SeoHead
        title="Répertoire des Créateurs"
        description="Découvrez les entrepreneurs, formateurs et créateurs de contenu africains présents sur ManuX."
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/80 pb-4 sm:pb-5">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-950 font-serif-heading">
            Répertoire des Créateurs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Explorez les boutiques et vitrines d'entrepreneurs africains d'exception
          </p>
        </div>

        <Link to="/onboarding">
          <Button variant="primary" size="sm" leftIcon={<Users className="w-4 h-4" />}>
            Rejoindre en tant que créateur
          </Button>
        </Link>
      </div>

      {creators.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
          {creators.map((creator) => (
            <Card key={creator.id} hoverable className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xl shrink-0 overflow-hidden border border-emerald-200/60">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      creator.display_name?.[0] || 'C'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {creator.display_name || creator.full_name}
                      </h3>
                      {(creator.is_verified || creator.subscription_plan === 'creator' || creator.subscription_plan === 'pro') && (
                        <VerifiedBadge size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      @{creator.username}
                    </p>
                    {creator.country && (
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        📍 {creator.city ? `${creator.city}, ` : ''}{creator.country}
                      </span>
                    )}
                  </div>
                </div>

                {creator.bio && (
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                    {creator.bio}
                  </p>
                )}

                {creator.primary_category && (
                  <div className="mb-4">
                    <Badge variant="category">{creator.primary_category}</Badge>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 capitalize">
                  {creator.profile_type}
                </span>
                <Link to={`/creators/${creator.username}`}>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    Voir la vitrine
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          type="creators"
          title="Les premiers créateurs arrivent bientôt."
          description="Soyez le premier créateur à publier votre profil et votre vitrine Chariow sur ManuX."
          actionText="Créer mon profil gratuit"
          actionHref="/onboarding"
        />
      )}
    </div>
  );
};
