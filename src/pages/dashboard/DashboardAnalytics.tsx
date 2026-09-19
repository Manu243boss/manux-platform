import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  Video,
  Package,
  Calendar,
  Percent,
  Activity,
  ArrowUpRight,
  ExternalLink,
  ShoppingBag,
  Zap,
  ChevronDown,
  RefreshCw,
  MessageSquare,
  Lock,
  Sparkles,
  Crown,
  BarChart3,
  Flame,
  ArrowRight,
  Download,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SeoHead } from '../../components/ui/SeoHead';
import { CacheService, CACHE_KEYS } from '../../services/cacheService';
import { ProUpgradeModal } from '../../components/dashboard/ProUpgradeModal';

interface ProductAnalytics {
  id: string;
  title: string;
  views: number;
  clicks: number;
  purchases: number;
}

interface VideoAnalytics {
  id: string;
  title: string;
  slug: string;
  views: number;
}

interface EventLog {
  id: string;
  event_type: string;
  created_at: string;
  product_id?: string;
  video_id?: string;
}

interface CreatorCommentItem {
  id: string;
  content: string;
  author_name: string;
  author_avatar?: string;
  created_at: string;
  likes_count: number;
  video_id?: string;
  product_id?: string;
  video_title?: string;
  product_title?: string;
}

export const DashboardAnalytics: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Upgrade Modal
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('Graphiques & Analyse Avancée');

  // Subscription check
  const plan = profile?.subscription_plan || 'free';
  const isSubscribed = plan === 'creator' || plan === 'pro';

  // High-level aggregates
  const [totalProfileViews, setTotalProfileViews] = useState(0);
  const [totalProductViews, setTotalProductViews] = useState(0);
  const [totalChariowClicks, setTotalChariowClicks] = useState(0);
  const [totalVideoViews, setTotalVideoViews] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);

  // Breakdown tables
  const [productsData, setProductsData] = useState<ProductAnalytics[]>([]);
  const [videosData, setVideosData] = useState<VideoAnalytics[]>([]);
  const [allEvents, setAllEvents] = useState<EventLog[]>([]);
  const [commentsData, setCommentsData] = useState<CreatorCommentItem[]>([]);
  const [visibleEventsCount, setVisibleEventsCount] = useState<number>(5);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const loadAnalytics = async (force: boolean = false) => {
    if (!user) return;
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      // Fetch events for this creator with cache
      const events = await CacheService.getOrFetch<EventLog[]>(
        CACHE_KEYS.USER_ANALYTICS(user.id),
        async () => {
          const [prodsRes, vidsRes] = await Promise.all([
            supabase.from('products').select('id, title, slug').eq('user_id', user.id),
            supabase.from('videos').select('id, title, slug').eq('user_id', user.id),
          ]);
          const prodIds = (prodsRes.data || []).map((p) => p.id);
          const vidIds = (vidsRes.data || []).map((v) => v.id);

          let query = supabase.from('analytics_events').select('*');
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

          const { data } = await query.order('created_at', { ascending: false });
          return data || [];
        },
        5 * 60 * 1000,
        force
      );

      if (events) {
        let pv = 0;
        let prodV = 0;
        let cc = 0;
        let vv = 0;
        let pch = 0;

        const prodViewsMap: Record<string, number> = {};
        const prodClicksMap: Record<string, number> = {};
        const prodPurchasesMap: Record<string, number> = {};
        const vidMap: Record<string, number> = {};

        events.forEach((ev) => {
          if (ev.event_type === 'creator_view') pv++;
          else if (ev.event_type === 'product_view') {
            prodV++;
            if (ev.product_id) {
              prodViewsMap[ev.product_id] = (prodViewsMap[ev.product_id] || 0) + 1;
            }
          } else if (ev.event_type === 'external_click') {
            cc++;
            if (ev.product_id) {
              prodClicksMap[ev.product_id] = (prodClicksMap[ev.product_id] || 0) + 1;
            }
          } else if (ev.event_type === 'video_view') {
            vv++;
            if (ev.video_id) {
              vidMap[ev.video_id] = (vidMap[ev.video_id] || 0) + 1;
            }
          } else if (ev.event_type === 'purchase_click' || ev.event_type === 'purchase_intent') {
            pch++;
            if (ev.product_id) {
              prodPurchasesMap[ev.product_id] = (prodPurchasesMap[ev.product_id] || 0) + 1;
            }
          }
        });

        setTotalProfileViews(pv);
        setTotalProductViews(prodV);
        setTotalChariowClicks(cc);
        setTotalVideoViews(vv);
        setTotalPurchases(pch);
        setAllEvents(events);

        // Fetch products details
        const { data: prods } = await supabase
          .from('products')
          .select('id, title, slug')
          .eq('user_id', user.id);

        if (prods) {
          const mappedProds: ProductAnalytics[] = prods.map((p) => ({
            id: p.id,
            title: p.title,
            views: prodViewsMap[p.id] || 0,
            clicks: prodClicksMap[p.id] || 0,
            purchases: prodPurchasesMap[p.id] || 0,
          }));
          mappedProds.sort((a, b) => b.views - a.views);
          setProductsData(mappedProds);
        }

        // Fetch videos details
        const { data: vids } = await supabase
          .from('videos')
          .select('id, title, slug')
          .eq('user_id', user.id);

        if (vids) {
          const mappedVids: VideoAnalytics[] = vids.map((v) => ({
            id: v.id,
            title: v.title,
            slug: v.slug,
            views: vidMap[v.id] || 0,
          }));
          mappedVids.sort((a, b) => b.views - a.views);
          setVideosData(mappedVids);
        }

        // Fetch creator's feedback comments across products and videos
        const pMap = new Map((prods || []).map((p) => [p.id, p.title]));
        const vMap = new Map((vids || []).map((v) => [v.id, v.title]));
        const prodIds = (prods || []).map((p) => p.id);
        const vidIds = (vids || []).map((v) => v.id);

        if (prodIds.length > 0 || vidIds.length > 0) {
          try {
            let cQuery = supabase.from('comments').select('*');
            const cConditions: string[] = [];
            if (prodIds.length > 0) cConditions.push(`product_id.in.(${prodIds.join(',')})`);
            if (vidIds.length > 0) cConditions.push(`video_id.in.(${vidIds.join(',')})`);
            cQuery = cQuery.or(cConditions.join(',')).order('created_at', { ascending: false }).limit(20);

            const { data: comms } = await cQuery;
            if (comms) {
              const mappedComms: CreatorCommentItem[] = comms.map((c: any) => ({
                id: c.id,
                content: c.content,
                author_name: c.author_name || 'Utilisateur',
                author_avatar: c.author_avatar,
                created_at: c.created_at,
                likes_count: c.likes_count || 0,
                video_id: c.video_id,
                product_id: c.product_id,
                video_title: c.video_id ? vMap.get(c.video_id) : undefined,
                product_title: c.product_id ? pMap.get(c.product_id) : undefined,
              }));
              setCommentsData(mappedComms);
            }
          } catch (commErr) {
            console.warn('[ManuX Comments fetch]', commErr);
          }
        }
      }
    } catch (err) {
      console.error('[ManuX Analytics] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics(false);
  }, [user]);

  // Calculations
  const totalImpressions = totalProfileViews + totalProductViews + totalVideoViews;
  const ctr = totalImpressions > 0 ? ((totalChariowClicks / totalImpressions) * 100).toFixed(1) : '0.0';
  const conversionRate = totalChariowClicks > 0 ? ((totalPurchases / totalChariowClicks) * 100).toFixed(1) : '0.0';

  // Real 7-day trend calculation
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayEvents = allEvents.filter((e) => e.created_at?.startsWith(dateStr));
    const clicks = dayEvents.filter((e) => e.event_type === 'external_click').length;
    const views = dayEvents.filter(
      (e) => e.event_type === 'product_view' || e.event_type === 'video_view' || e.event_type === 'creator_view'
    ).length;
    return {
      day: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      views,
      clicks,
    };
  });

  const maxDailyViews = Math.max(...last7Days.map((d) => d.views), 5);

  const displayedEvents = allEvents.slice(0, visibleEventsCount);

  return (
    <div className="space-y-6">
      <SeoHead title="Analytics & Graphiques Avancés - Dashboard ManuX" />

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        metricTitle={selectedMetric}
      />

      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 font-serif-heading">
              Analytics & Graphiques de Performance
            </h1>
            {isSubscribed ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                <Crown className="w-3 h-3 text-amber-700" />
                Accès {plan.toUpperCase()}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                Plan Gratuit
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
            Données réelles enregistrées sur vos boutiques Chariow, vidéos de démo et interactions visiteurs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isSubscribed && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedMetric('Graphiques Avancés & Entonnoir Chariow');
                setUpgradeModalOpen(true);
              }}
              className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 border-0"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Débloquer Pro</span>
            </Button>
          )}

          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Vue d'ensemble</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('chariow')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'chariow'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <MousePointerClick className="w-3.5 h-3.5 text-emerald-500" />
          <span>Entonnoir Chariow</span>
          {!isSubscribed && <Lock className="w-3 h-3 text-amber-600 ml-1" />}
        </button>

        <button
          type="button"
          onClick={() => setTab('videos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'videos'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Video className="w-3.5 h-3.5 text-amber-500" />
          <span>Démonstrations Vidéo</span>
          {!isSubscribed && <Lock className="w-3 h-3 text-amber-600 ml-1" />}
        </button>

        <button
          type="button"
          onClick={() => setTab('comments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'comments'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
          <span>Commentaires & Avis ({commentsData.length})</span>
          {!isSubscribed && <Lock className="w-3 h-3 text-amber-600 ml-1" />}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider">Impressions</span>
            <Eye className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950">{totalImpressions}</div>
          <p className="text-[11px] font-bold text-slate-700">Vues totales catalogue</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider">Clics Chariow</span>
            <MousePointerClick className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950">{totalChariowClicks}</div>
          <p className="text-[11px] font-bold text-slate-700">Redirections boutique</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider">Taux de Clic (CTR)</span>
            <Percent className="w-4 h-4 text-amber-800" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950">{ctr}%</div>
          <p className="text-[11px] font-bold text-slate-700">Taux clics/impressions</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider">Achats / Webhooks</span>
            <ShoppingBag className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950">{totalPurchases}</div>
          <p className="text-[11px] font-bold text-slate-700">Intentions d'achat</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider">Conversion (CR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950">{conversionRate}%</div>
          <p className="text-[11px] font-bold text-slate-700">Achats / Clics Chariow</p>
        </Card>
      </div>

      {/* TAB 1: VUE D'ENSEMBLE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Interactive 7-Day Trend Chart */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>Activité Réelle des 7 Derniers Jours</span>
                </h2>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  Comparatif quotidien entre les impressions de vos fiches et les clics sortants vers Chariow
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500" />
                  <span className="text-slate-700">Impressions</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-600" />
                  <span className="text-slate-700">Clics Chariow</span>
                </div>
              </div>
            </div>

            {/* Custom Bar Graph */}
            <div className="pt-4">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 h-44 items-end pb-2 border-b border-slate-200">
                {last7Days.map((item, idx) => {
                  const viewHeight = Math.max(8, Math.round((item.views / maxDailyViews) * 100));
                  const clickHeight = Math.max(4, Math.round((item.clicks / maxDailyViews) * 100));

                  return (
                    <div key={idx} className="flex flex-col items-center h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                        {/* Impressions Bar */}
                        <div
                          className="w-1/2 max-w-[20px] bg-amber-400 group-hover:bg-amber-500 rounded-t-lg transition-all duration-300 relative"
                          style={{ height: `${viewHeight}%` }}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black bg-slate-900 text-white px-1 py-0.5 rounded transition-opacity pointer-events-none whitespace-nowrap">
                            {item.views} vues
                          </span>
                        </div>

                        {/* Clicks Bar */}
                        <div
                          className="w-1/2 max-w-[20px] bg-emerald-600 group-hover:bg-emerald-700 rounded-t-lg transition-all duration-300 relative"
                          style={{ height: `${clickHeight}%` }}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black bg-emerald-950 text-white px-1 py-0.5 rounded transition-opacity pointer-events-none whitespace-nowrap">
                            {item.clicks} clics
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 mt-2 uppercase">
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Product Performance Table */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                  Performance Détaillée par Produit
                </h2>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  Vues, clics vers Chariow et conversion individuelle
                </p>
              </div>
            </div>

            {productsData.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-slate-700">
                Aucun produit configuré ou aucun événement enregistré.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-800 uppercase font-black tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Produit</th>
                      <th className="py-2.5 px-3 text-center">Vues</th>
                      <th className="py-2.5 px-3 text-center">Clics Chariow</th>
                      <th className="py-2.5 px-3 text-center">CTR</th>
                      <th className="py-2.5 px-3 text-center">Achats</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-950">
                    {productsData.map((p) => {
                      const productCtr = p.views > 0 ? ((p.clicks / p.views) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-950 truncate max-w-xs">
                            {p.title}
                          </td>
                          <td className="py-3 px-3 text-center font-bold">{p.views}</td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-900">{p.clicks}</td>
                          <td className="py-3 px-3 text-center font-black">{productCtr}%</td>
                          <td className="py-3 px-3 text-center font-bold text-purple-900">{p.purchases}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: ENTONNOIR CHARIOW */}
      {activeTab === 'chariow' && (
        <div className="space-y-6">
          {!isSubscribed && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center font-bold shrink-0">
                  <Crown className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h4 className="text-sm font-black">L'analyse avancée de l'entonnoir Chariow est réservée aux abonnés</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Passez en Créateur ($2.50) ou Pro ($9) pour voir le taux de conversion étape par étape et optimiser vos ventes.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSelectedMetric('Entonnoir Chariow & Clics Achat');
                  setUpgradeModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white border-0 text-xs font-bold shrink-0"
              >
                Passer en Pro ($9)
              </Button>
            </div>
          )}

          <Card className="p-5 sm:p-6 space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-emerald-600" />
                <span>Entonnoir de Conversion vers Chariow</span>
              </h2>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                Suivi de la progression du visiteur depuis la découverte jusqu'à l'achat sur Chariow
              </p>
            </div>

            {/* Funnel visualization */}
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">1</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Visites & Impressions Fiches</div>
                    <div className="text-[11px] text-slate-500">Visiteurs ayant découvert vos produits</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-slate-950">{totalProductViews}</span>
                  <span className="block text-[10px] text-slate-500">100% de la portée</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">2</span>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">Clics vers la Boutique Chariow</div>
                    <div className="text-[11px] text-emerald-800">Visiteurs redirigés vers vos liens externes</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-950">{totalChariowClicks}</span>
                  <span className="block text-[10px] text-emerald-800">{ctr}% de conversion</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center">3</span>
                  <div>
                    <div className="text-xs font-bold text-purple-950">Intentions d'Achat & Webhooks Chariow</div>
                    <div className="text-[11px] text-purple-800">Achats confirmés et transactions webhook</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-purple-950">{totalPurchases}</span>
                  <span className="block text-[10px] text-purple-800">{conversionRate}% des clics</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: DÉMONSTRATIONS VIDÉO */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-600" />
                  <span>Impact des Démonstrations Vidéo YouTube</span>
                </h2>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  Lectures démo et engagement vidéo par produit
                </p>
              </div>
            </div>

            {videosData.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-slate-700">
                Aucune vidéo de démonstration publiée pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videosData.map((v) => (
                  <div key={v.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{v.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">ID: {v.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-slate-950">{v.views}</span>
                      <span className="block text-[10px] text-slate-500 font-bold">lectures démo</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: COMMENTAIRES & AVIS */}
      {activeTab === 'comments' && (
        <div className="space-y-6">
          {!isSubscribed && (
            <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-200/80 flex items-center justify-center font-bold shrink-0">
                  <MessageSquare className="w-5 h-5 text-purple-800" />
                </div>
                <div>
                  <h4 className="text-sm font-black">Gestion centralisée des commentaires réservée aux abonnés</h4>
                  <p className="text-xs text-purple-800 mt-0.5">
                    Modérez vos commentaires, répondez avec badge officiel créateur et analysez les retours clients.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSelectedMetric('Gestion et Modération des Commentaires');
                  setUpgradeModalOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white border-0 text-xs font-bold shrink-0"
              >
                Passer en Créateur ($2.50)
              </Button>
            </div>
          )}

          <Card className="p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span>Derniers Commentaires & Avis Reçus</span>
                </h2>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  Commentaires déposés sur vos fiches produits et vidéos de démonstration
                </p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
                {commentsData.length} commentaire{commentsData.length > 1 ? 's' : ''}
              </span>
            </div>

            {commentsData.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-slate-600">
                Aucun commentaire client reçu pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {commentsData.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {c.author_avatar ? (
                          <img src={c.author_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                            {c.author_name[0] || 'U'}
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-900">{c.author_name}</span>
                        {(c.product_title || c.video_title) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium truncate max-w-xs">
                            sur {c.product_title || c.video_title}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Journal des événements récents */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Journal des Événements & Webhooks Récents</span>
            </h2>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              Historique des interactions capturées (clics Chariow, vues démo, webhooks)
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            {allEvents.length} interaction{allEvents.length > 1 ? 's' : ''} au total
          </span>
        </div>

        {allEvents.length === 0 ? (
          <div className="py-6 text-center text-xs font-bold text-slate-700">
            Aucun événement enregistré pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {displayedEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      ev.event_type === 'external_click'
                        ? 'bg-emerald-600'
                        : ev.event_type === 'purchase_click' || ev.event_type === 'purchase_intent'
                        ? 'bg-purple-600'
                        : ev.event_type === 'video_view'
                        ? 'bg-amber-500'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span className="font-bold text-slate-950 uppercase text-[11px]">
                    {ev.event_type === 'external_click'
                      ? 'Clic Chariow (Redirection)'
                      : ev.event_type === 'purchase_intent' || ev.event_type === 'purchase_click'
                      ? 'Intention Achat Webhook'
                      : ev.event_type === 'video_view'
                      ? 'Vue Vidéo Démo'
                      : ev.event_type.replace('_', ' ')}
                  </span>
                </div>

                <span className="text-[11px] font-semibold text-slate-700">
                  {new Date(ev.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}

            {/* Load More Button if more than 5 events */}
            {allEvents.length > visibleEventsCount && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleEventsCount((prev) => Math.min(prev + 5, allEvents.length))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Afficher 5 de plus ({allEvents.length - visibleEventsCount} restants)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
