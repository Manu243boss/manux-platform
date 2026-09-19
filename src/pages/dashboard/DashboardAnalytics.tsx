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
  Heart,
  MessageCircle,
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
  is_creator_reply?: boolean;
  video_id?: string;
  product_id?: string;
  video_title?: string;
  product_title?: string;
  type: 'product' | 'video';
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

  // Breakdown tables & comments metrics
  const [productsData, setProductsData] = useState<ProductAnalytics[]>([]);
  const [videosData, setVideosData] = useState<VideoAnalytics[]>([]);
  const [allEvents, setAllEvents] = useState<EventLog[]>([]);
  const [commentsData, setCommentsData] = useState<CreatorCommentItem[]>([]);
  const [totalCommentLikes, setTotalCommentLikes] = useState(0);
  const [visibleEventsCount, setVisibleEventsCount] = useState<number>(5);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const loadAnalytics = async (force: boolean = false) => {
    if (!user) return;
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      // Fetch products and videos for this user
      const [prodsRes, vidsRes] = await Promise.all([
        supabase.from('products').select('id, title, slug').eq('user_id', user.id),
        supabase.from('videos').select('id, title, slug').eq('user_id', user.id),
      ]);

      const prods = prodsRes.data || [];
      const vids = vidsRes.data || [];
      const prodIds = prods.map((p) => p.id);
      const vidIds = vids.map((v) => v.id);
      const pMap = new Map(prods.map((p) => [p.id, p.title]));
      const vMap = new Map(vids.map((v) => [v.id, v.title]));

      // Fetch events with cache
      const events = await CacheService.getOrFetch<EventLog[]>(
        CACHE_KEYS.USER_ANALYTICS(user.id),
        async () => {
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

        // Map products data
        const mappedProds: ProductAnalytics[] = prods.map((p) => ({
          id: p.id,
          title: p.title,
          views: prodViewsMap[p.id] || 0,
          clicks: prodClicksMap[p.id] || 0,
          purchases: prodPurchasesMap[p.id] || 0,
        }));
        mappedProds.sort((a, b) => b.views - a.views);
        setProductsData(mappedProds);

        // Map videos data
        const mappedVids: VideoAnalytics[] = vids.map((v) => ({
          id: v.id,
          title: v.title,
          slug: v.slug,
          views: vidMap[v.id] || 0,
        }));
        mappedVids.sort((a, b) => b.views - a.views);
        setVideosData(mappedVids);

        // Fetch comments across both 'comments' and 'product_comments' tables
        const combinedComments: CreatorCommentItem[] = [];

        // 1. Video comments
        if (vidIds.length > 0) {
          try {
            const { data: vComms } = await supabase
              .from('comments')
              .select('*')
              .in('video_id', vidIds)
              .order('created_at', { ascending: false })
              .limit(30);

            if (vComms) {
              vComms.forEach((c: any) => {
                combinedComments.push({
                  id: c.id,
                  content: c.content,
                  author_name: c.author_name || 'Utilisateur ManuX',
                  author_avatar: c.author_avatar,
                  created_at: c.created_at,
                  likes_count: c.likes_count || 0,
                  is_creator_reply: Boolean(c.is_creator_reply),
                  video_id: c.video_id,
                  video_title: vMap.get(c.video_id),
                  type: 'video',
                });
              });
            }
          } catch (err) {
            console.debug('[ManuX Analytics] Video comments query notice:', err);
          }
        }

        // 2. Product comments
        if (prodIds.length > 0) {
          try {
            const { data: pComms } = await supabase
              .from('product_comments')
              .select('*')
              .in('product_id', prodIds)
              .order('created_at', { ascending: false })
              .limit(30);

            if (pComms) {
              pComms.forEach((c: any) => {
                combinedComments.push({
                  id: c.id,
                  content: c.content,
                  author_name: c.author_name || 'Visiteur ManuX',
                  author_avatar: c.author_avatar,
                  created_at: c.created_at,
                  likes_count: c.likes_count || 0,
                  is_creator_reply: Boolean(c.is_creator_reply),
                  product_id: c.product_id,
                  product_title: pMap.get(c.product_id),
                  type: 'product',
                });
              });
            }
          } catch (err) {
            console.debug('[ManuX Analytics] Product comments query notice:', err);
          }
        }

        // Sort descending by created_at
        combinedComments.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setCommentsData(combinedComments);

        // Sum likes count
        const totalLikes = combinedComments.reduce((acc, curr) => acc + (curr.likes_count || 0), 0);
        setTotalCommentLikes(totalLikes);
      }
    } catch (err) {
      console.error('[ManuX Analytics] Error loading analytics:', err);
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

  // Real 7-day trend calculation (Views, Clics, Commentaires & Likes)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayEvents = allEvents.filter((e) => e.created_at?.startsWith(dateStr));
    const clicks = dayEvents.filter((e) => e.event_type === 'external_click').length;
    const views = dayEvents.filter(
      (e) => e.event_type === 'product_view' || e.event_type === 'video_view' || e.event_type === 'creator_view'
    ).length;
    const dayComments = commentsData.filter((c) => c.created_at?.startsWith(dateStr)).length;
    return {
      day: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      views,
      clicks,
      comments: dayComments,
    };
  });

  const maxDailyViews = Math.max(...last7Days.map((d) => Math.max(d.views, d.clicks, d.comments)), 5);
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
            Données réelles enregistrées sur vos boutiques Chariow, vidéos de démo, commentaires et interactions visiteurs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isSubscribed && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedMetric('Graphiques Avancés & Analytics Commentaires');
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

      {/* KPI Cards Grid (Including Comments & Likes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Impressions</span>
            <Eye className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-950">{totalImpressions}</div>
          <p className="text-[10px] font-bold text-slate-600">Vues catalogue</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Clics Chariow</span>
            <MousePointerClick className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950">{totalChariowClicks}</div>
          <p className="text-[10px] font-bold text-slate-600">Redirections</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider">CTR</span>
            <Percent className="w-3.5 h-3.5 text-amber-800" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-950">{ctr}%</div>
          <p className="text-[10px] font-bold text-slate-600">Clics / Vues</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Achats Chariow</span>
            <ShoppingBag className="w-3.5 h-3.5 text-purple-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-950">{totalPurchases}</div>
          <p className="text-[10px] font-bold text-slate-600">Intentions d'achat</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Commentaires</span>
            <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-950">{commentsData.length}</div>
          <p className="text-[10px] font-bold text-slate-600">Avis reçus</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Likes Avis</span>
            <Heart className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-950">{totalCommentLikes}</div>
          <p className="text-[10px] font-bold text-slate-600">J'aime reçus</p>
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
                  <span>Activité & Engagement des 7 Derniers Jours</span>
                </h2>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  Comparatif quotidien entre les impressions, les clics sortants Chariow et les avis
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
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-purple-500" />
                  <span className="text-slate-700">Commentaires</span>
                </div>
              </div>
            </div>

            {/* Custom Bar Graph */}
            <div className="pt-4">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 h-44 items-end pb-2 border-b border-slate-200">
                {last7Days.map((item, idx) => {
                  const viewHeight = Math.max(8, Math.round((item.views / maxDailyViews) * 100));
                  const clickHeight = Math.max(4, Math.round((item.clicks / maxDailyViews) * 100));
                  const commHeight = Math.max(4, Math.round((item.comments / maxDailyViews) * 100));

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        {/* Views Bar */}
                        <div
                          style={{ height: `${viewHeight}%` }}
                          className="w-1/3 bg-amber-400 hover:bg-amber-500 rounded-t transition-all group relative"
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900 text-white text-[9px] rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {item.views} vues
                          </div>
                        </div>

                        {/* Clicks Bar */}
                        <div
                          style={{ height: `${clickHeight}%` }}
                          className="w-1/3 bg-emerald-600 hover:bg-emerald-500 rounded-t transition-all group relative"
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-emerald-950 text-white text-[9px] rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {item.clicks} clics
                          </div>
                        </div>

                        {/* Comments Bar */}
                        <div
                          style={{ height: `${commHeight}%` }}
                          className="w-1/3 bg-purple-500 hover:bg-purple-600 rounded-t transition-all group relative"
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-purple-950 text-white text-[9px] rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {item.comments} avis
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase">
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Breakdown Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-600" />
                  <span>Performance par Produit</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-500">{productsData.length} produits</span>
              </div>

              {productsData.length === 0 ? (
                <div className="py-6 text-center text-xs font-semibold text-slate-600">
                  Aucun produit synchronisé depuis Chariow.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {productsData.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-900 truncate max-w-[180px]">{p.title}</span>
                      <div className="flex items-center gap-3 font-bold text-slate-700">
                        <span>{p.views} vues</span>
                        <span className="text-emerald-700">{p.clicks} clics</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top Videos */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-amber-600" />
                  <span>Performance par Vidéo Démo</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-500">{videosData.length} vidéos</span>
              </div>

              {videosData.length === 0 ? (
                <div className="py-6 text-center text-xs font-semibold text-slate-600">
                  Aucune démonstration vidéo publiée.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {videosData.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-900 truncate max-w-[180px]">{v.title}</span>
                      <span className="font-black text-amber-900">{v.views} lectures</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ENTONNOIR CHARIOW */}
      {activeTab === 'chariow' && (
        <div className="space-y-6">
          {!isSubscribed && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center font-bold shrink-0">
                  <Crown className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h4 className="text-sm font-black">Graphiques d'entonnoir avancés réservés aux abonnés</h4>
                  <p className="text-xs text-amber-900 mt-0.5">
                    Analysez les taux de passage entre impressions de vos fiches, clics Chariow et webhooks de vente.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSelectedMetric('Entonnoir de Conversion Chariow');
                  setUpgradeModalOpen(true);
                }}
                className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold shrink-0"
              >
                Passer en Créateur ($2.50)
              </Button>
            </div>
          )}

          <Card className="p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
              Entonnoir de Trafic vers Chariow
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">1. Impressions Catalogue</span>
                <div className="text-2xl font-black text-slate-950">{totalImpressions}</div>
                <p className="text-[11px] text-slate-600">Visiteurs ayant vu vos fiches</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[11px] font-bold text-emerald-900 uppercase">2. Clics Sortants Chariow</span>
                <div className="text-2xl font-black text-emerald-950">{totalChariowClicks}</div>
                <p className="text-[11px] text-emerald-800">Taux de clic : {ctr}%</p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                <span className="text-[11px] font-bold text-purple-900 uppercase">3. Intentions / Webhooks</span>
                <div className="text-2xl font-black text-purple-950">{totalPurchases}</div>
                <p className="text-[11px] text-purple-800">Taux conversion : {conversionRate}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: DEMONSTRATIONS VIDEO */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-600" />
                  <span>Statistiques des Démonstrations Vidéo</span>
                </h2>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  Vues réelles générées par vos lecteurs vidéo intégrés
                </p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
                {totalVideoViews} vue{totalVideoViews > 1 ? 's' : ''} au total
              </span>
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
                      <span className="block text-[10px] text-slate-500 font-bold">lectures</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: COMMENTAIRES, AVIS & LIKES */}
      {activeTab === 'comments' && (
        <div className="space-y-6">
          {!isSubscribed && (
            <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-200/80 flex items-center justify-center font-bold shrink-0">
                  <MessageSquare className="w-5 h-5 text-purple-800" />
                </div>
                <div>
                  <h4 className="text-sm font-black">Gestion centralisée & graphiques de commentaires</h4>
                  <p className="text-xs text-purple-800 mt-0.5">
                    Modérez vos avis, analysez les likes reçus et répondez avec le badge officiel créateur.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSelectedMetric('Gestion et Analyse des Commentaires');
                  setUpgradeModalOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white border-0 text-xs font-bold shrink-0"
              >
                Passer en Créateur ($2.50)
              </Button>
            </div>
          )}

          {/* Comments & Likes Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1 bg-purple-50/50 border-purple-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Total Avis & Questions</span>
              </span>
              <div className="text-2xl font-black text-purple-950">{commentsData.length}</div>
              <p className="text-[10px] text-purple-800">Sous vos produits et vidéos</p>
            </Card>

            <Card className="p-4 space-y-1 bg-rose-50/50 border-rose-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-900 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                <span>Total J'aime (Likes)</span>
              </span>
              <div className="text-2xl font-black text-rose-950">{totalCommentLikes}</div>
              <p className="text-[10px] text-rose-800">Reçus sur les interactions</p>
            </Card>

            <Card className="p-4 space-y-1 bg-emerald-50/50 border-emerald-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Réponses Créateur</span>
              </span>
              <div className="text-2xl font-black text-emerald-950">
                {commentsData.filter((c) => c.is_creator_reply).length}
              </div>
              <p className="text-[10px] text-emerald-800">Interactions directes avec vos clients</p>
            </Card>
          </div>

          <Card className="p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span>Derniers Commentaires & Avis Reçus</span>
                </h2>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  Liste des avis déposés par vos visiteurs avec compteurs de mentions J'aime
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
                        {c.is_creator_reply && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase tracking-wider border border-amber-300">
                            Créateur
                          </span>
                        )}
                        {(c.product_title || c.video_title) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium truncate max-w-xs">
                            sur {c.product_title || c.video_title} ({c.type === 'product' ? 'Produit' : 'Vidéo'})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                          <Heart className="w-3 h-3 fill-rose-600" />
                          <span>{c.likes_count}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
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
              <span>Journal des Événements & Interactions Récents</span>
            </h2>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              Historique des interactions capturées en direct (clics Chariow, vues démo, webhooks)
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
