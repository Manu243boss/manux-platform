import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  MousePointerClick,
  Video,
  Package,
  Store,
  ArrowUpRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Percent,
  ShoppingBag,
  Sparkles,
  Key,
  Layers,
  ArrowRight,
  Lock,
  Crown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SeoHead } from '../../components/ui/SeoHead';
import { ProUpgradeModal } from '../../components/dashboard/ProUpgradeModal';

export const DashboardOverview: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [productsCount, setProductsCount] = useState(0);
  const [videosCount, setVideosCount] = useState(0);
  const [storesCount, setStoresCount] = useState(0);

  // Real recorded analytics counters
  const [profileViews, setProfileViews] = useState(0);
  const [productViews, setProductViews] = useState(0);
  const [externalClicks, setExternalClicks] = useState(0);
  const [videoViews, setVideoViews] = useState(0);
  const [purchaseClicks, setPurchaseClicks] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pro Upgrade Modal State
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedMetricTitle, setSelectedMetricTitle] = useState('');

  // Plan limits
  const plan = profile?.subscription_plan || 'free';
  const isSubscribed = plan === 'creator' || plan === 'pro';
  const maxProducts = plan === 'pro' ? 100 : plan === 'creator' ? 20 : 3;
  const maxStores = plan === 'pro' ? 10 : plan === 'creator' ? 2 : 1;

  const handleStatCardClick = (metricName: string, targetTab: string) => {
    if (!isSubscribed) {
      setSelectedMetricTitle(metricName);
      setUpgradeModalOpen(true);
    } else {
      navigate(`/dashboard/analytics?tab=${targetTab}`);
    }
  };

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      try {
        setLoading(true);

        // 1. Fetch counts
        const [pRes, vRes, sRes] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('videos').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('stores').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);

        if (pRes.count !== null) setProductsCount(pRes.count);
        if (vRes.count !== null) setVideosCount(vRes.count);
        if (sRes.count !== null) setStoresCount(sRes.count);

        // 2. Fetch real recorded analytics events for this creator
        const prodIds = (pRes.data || []).map((p: any) => p.id);
        const vidIds = (vRes.data || []).map((v: any) => v.id);

        let query = supabase.from('analytics_events').select('event_type');
        if (prodIds.length > 0 || vidIds.length > 0) {
          const orConditions = [`creator_id.eq.${user.id}`];
          if (prodIds.length > 0) {
            orConditions.push(`product_id.in.(${prodIds.join(',')})`);
          }
          if (vidIds.length > 0) {
            orConditions.push(`video_id.in.(${vidIds.join(',')})`);
          }
          query = query.or(orConditions.join(','));
        } else {
          query = query.eq('creator_id', user.id);
        }

        const { data: events } = await query;

        if (events) {
          let pv = 0;
          let prodv = 0;
          let ext = 0;
          let vv = 0;
          let pch = 0;

          events.forEach((ev) => {
            if (ev.event_type === 'creator_view') pv++;
            else if (ev.event_type === 'product_view') prodv++;
            else if (ev.event_type === 'external_click') ext++;
            else if (ev.event_type === 'video_view') vv++;
            else if (ev.event_type === 'purchase_click' || ev.event_type === 'purchase_intent') pch++;
          });

          setProfileViews(pv);
          setProductViews(prodv);
          setExternalClicks(ext);
          setVideoViews(vv);
          setPurchaseClicks(pch);
        }
      } catch (err) {
        console.error('[ManuX Dashboard] Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user]);

  const isProfileComplete = profile?.onboarding_completed;

  // Real calculations
  const totalImpressions = profileViews + productViews + videoViews;
  const ctr = totalImpressions > 0 ? ((externalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
  const conversionRate = externalClicks > 0 ? ((purchaseClicks / externalClicks) * 100).toFixed(1) : '0.0';

  // Real traffic distribution percentages
  const trafficSearch = totalImpressions > 0 ? Math.round((productViews / totalImpressions) * 100) : 0;
  const trafficVideo = totalImpressions > 0 ? Math.round((videoViews / totalImpressions) * 100) : 0;
  const trafficProfile = totalImpressions > 0 ? Math.max(0, 100 - trafficSearch - trafficVideo) : 0;

  return (
    <div className="space-y-6">
      <SeoHead title="Vue d'ensemble • Dashboard ManuX" />

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        metricTitle={selectedMetricTitle}
      />

      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 font-serif-heading">
              Bonjour, {profile?.display_name || user?.email?.split('@')[0] || 'Créateur'}
            </h1>
            {isProfileComplete ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Profil Complet
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                À terminer
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-1">
            Vos statistiques réelles, clics vers vos boutiques Chariow et performances de découverte.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/dashboard/store">
            <Button variant="outline" size="sm" leftIcon={<Key className="w-3.5 h-3.5 text-slate-900" />}>
              Importer via API Chariow
            </Button>
          </Link>
          <Link to="/dashboard/products">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Nouveau Produit
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid of Advanced KPI Cards (Interactive & Clickable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Impressions */}
        <div
          onClick={() => handleStatCardClick('Impressions Totales & Audience', 'overview')}
          className="cursor-pointer group block"
        >
          <Card className="p-4 sm:p-5 space-y-3 hover:border-amber-400 hover:shadow-sm transition-all relative overflow-hidden bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                Impressions Totales
                {!isSubscribed && <Lock className="w-3 h-3 text-amber-600 ml-1" />}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-amber-100 text-slate-900 group-hover:text-amber-950 flex items-center justify-center font-bold transition-colors">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {totalImpressions}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] font-bold text-slate-700">
                  {productViews} prods • {videoViews} vids • {profileViews} profil
                </p>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
            </div>
          </Card>
        </div>

        {/* Card 2: Chariow Clicks */}
        <div
          onClick={() => handleStatCardClick('Clics vers Boutiques Chariow', 'chariow')}
          className="cursor-pointer group block"
        >
          <Card className="p-4 sm:p-5 space-y-3 hover:border-emerald-400 hover:shadow-sm transition-all relative overflow-hidden bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                Clics vers Chariow
                {!isSubscribed && <Lock className="w-3 h-3 text-amber-600 ml-1" />}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-950 flex items-center justify-center font-bold">
                <MousePointerClick className="w-4 h-4 text-emerald-700" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                {externalClicks}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] font-bold text-slate-700">
                  Redirections d'achat réelles
                </p>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </Card>
        </div>

        {/* Card 3: Click-Through Rate (CTR) */}
        <div
          onClick={() => handleStatCardClick('Taux de Clics (CTR) et Engagement', 'overview')}
          className="cursor-pointer group block"
        >
          <Card className="p-4 sm:p-5 space-y-3 hover:border-amber-400 hover:shadow-sm transition-all relative overflow-hidden bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                Taux de Clic (CTR)
                {!isSubscribed && <Lock className="w-3 h-3 text-amber-600 ml-1" />}
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-950 flex items-center justify-center font-bold">
                <Percent className="w-4 h-4 text-amber-800" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {ctr}%
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] font-bold text-slate-700">
                  Efficacité des fiches et démos
                </p>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
            </div>
          </Card>
        </div>

        {/* Card 4: Purchase Intents & Webhooks */}
        <div
          onClick={() => handleStatCardClick('Conversions et Intentions d’Achat', 'chariow')}
          className="cursor-pointer group block"
        >
          <Card className="p-4 sm:p-5 space-y-3 hover:border-purple-400 hover:shadow-sm transition-all relative overflow-hidden bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                Intentions d'Achat
                {!isSubscribed && <Lock className="w-3 h-3 text-amber-600 ml-1" />}
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-950 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4 text-purple-700" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {purchaseClicks}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] font-bold text-slate-700">
                  Taux de conversion : {conversionRate}%
                </p>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quotas & Subscription Limits Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Products Quota */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-900" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Produits actifs ({productsCount}/{maxProducts})
              </span>
            </div>
            <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-900">
              Plan {plan.toUpperCase()}
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                productsCount >= maxProducts ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, (productsCount / maxProducts) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>
              {maxProducts - productsCount > 0
                ? `${maxProducts - productsCount} emplacement(s) restant(s)`
                : 'Quota atteint'}
            </span>
            {productsCount >= maxProducts && plan !== 'pro' && (
              <Link
                to="/dashboard/subscription"
                className="text-emerald-800 hover:text-emerald-950 font-black underline"
              >
                Augmenter ma limite
              </Link>
            )}
          </div>
        </Card>

        {/* Stores Quota */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-900" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Boutiques Chariow connectées ({storesCount}/{maxStores})
              </span>
            </div>
            <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-900">
              Plan {plan.toUpperCase()}
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                storesCount >= maxStores ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, (storesCount / maxStores) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>
              {maxStores - storesCount > 0
                ? `${maxStores - storesCount} boutique(s) possible(s)`
                : 'Limite de boutiques atteinte'}
            </span>
            {storesCount >= maxStores && plan !== 'pro' && (
              <Link
                to="/dashboard/subscription"
                className="text-emerald-800 hover:text-emerald-950 font-black underline"
              >
                Passer au plan supérieur
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Traffic Distribution Breakdown */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
              Répartition du Trafic & Sources de Découverte
            </h2>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              D'où viennent vos visiteurs sur ManuX ? (Calculé à partir des événements réels enregistrés)
            </p>
          </div>
          <Link
            to="/dashboard/analytics"
            className="text-xs font-black text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
          >
            <span>Détails avancés</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {totalImpressions === 0 ? (
          <div className="text-center py-6 text-xs font-bold text-slate-700">
            Aucun événement pour le moment. Dès que vos liens et vidéos sont consultés, les pourcentages s'afficheront ici.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-800">Consultation Produits</div>
              <div className="text-2xl font-black text-slate-950">{trafficSearch}%</div>
              <p className="text-[11px] font-semibold text-slate-700">{productViews} affichages</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="text-xs font-bold text-emerald-950">Vidéos de Démonstration</div>
              <div className="text-2xl font-black text-emerald-950">{trafficVideo}%</div>
              <p className="text-[11px] font-semibold text-emerald-900">{videoViews} lectures démo</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <div className="text-xs font-bold text-amber-950">Vitrine & Profil</div>
              <div className="text-2xl font-black text-amber-950">{trafficProfile}%</div>
              <p className="text-[11px] font-semibold text-amber-900">{profileViews} visites directes</p>
            </div>
          </div>
        )}
      </Card>

      {/* Quick Access Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/dashboard/store"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-600 hover:shadow-xs transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-900 group-hover:text-emerald-900 flex items-center justify-center font-bold transition-colors shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-slate-950">Clés API Chariow</div>
            <div className="text-xs font-semibold text-slate-800">Gérer mes boutiques et synchronisations</div>
          </div>
        </Link>

        <Link
          to="/dashboard/videos"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-600 hover:shadow-xs transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-900 group-hover:text-emerald-900 flex items-center justify-center font-bold transition-colors shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-slate-950">Vidéos de Démo</div>
            <div className="text-xs font-semibold text-slate-800">Ajouter un lien YouTube non répertorié</div>
          </div>
        </Link>

        <Link
          to="/dashboard/subscription"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-600 hover:shadow-xs transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-900 group-hover:text-emerald-900 flex items-center justify-center font-bold transition-colors shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-slate-950">Abonnement & Quotas</div>
            <div className="text-xs font-semibold text-slate-800">Évoluer vers Créateur ($2.50) ou Pro ($9)</div>
          </div>
        </Link>
      </div>
    </div>
  );
};
