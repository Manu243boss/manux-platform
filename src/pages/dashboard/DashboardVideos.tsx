import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Video as VideoIcon,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  AlertCircle,
  Lock,
  Sparkles,
  Image as ImageIcon,
  ArrowRight,
  Edit2,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Video as VideoType, Product } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SeoHead } from '../../components/ui/SeoHead';
import { ChariowConnector } from '../../services/chariow';

export const DashboardVideos: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Pro plan verification
  const isProPlan = profile?.subscription_plan === 'pro';

  // Form states
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [productId, setProductId] = useState('');
  const [description, setDescription] = useState('');
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit modal / thumbnail update for Pro plan
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [updatingThumbnail, setUpdatingThumbnail] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [vRes, pRes] = await Promise.all([
        supabase
          .from('videos')
          .select('*, product:products(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('user_id', user.id),
      ]);
      if (vRes.data) setVideos(vRes.data);
      if (pRes.data) setProducts(pRes.data);
    } catch (err) {
      console.error('[ManuX Videos] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !youtubeUrl || saving) return;

    const videoId = ChariowConnector.extractYouTubeId(youtubeUrl);
    if (!videoId) {
      setErrorMsg('Lien YouTube invalide. Veuillez entrer un lien YouTube valide (ex: https://youtu.be/... ou https://youtube.com/watch?v=...).');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + `-${Date.now().toString().slice(-4)}`;

      // Use custom thumbnail if user is Pro and provided one; otherwise standard YouTube HQ thumbnail
      const finalThumbnail =
        isProPlan && customThumbnailUrl.trim()
          ? customThumbnailUrl.trim()
          : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const { error } = await supabase.from('videos').insert({
        user_id: user.id,
        product_id: productId || null,
        title: title.trim(),
        slug,
        youtube_url: youtubeUrl.trim(),
        youtube_video_id: videoId,
        thumbnail_url: finalThumbnail,
        description: description.trim(),
        status: 'published',
      });

      if (error) throw error;

      setTitle('');
      setYoutubeUrl('');
      setProductId('');
      setDescription('');
      setCustomThumbnailUrl('');
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’ajout de la vidéo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditThumbnail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo || !isProPlan) return;

    try {
      setUpdatingThumbnail(true);
      const { error } = await supabase
        .from('videos')
        .update({
          thumbnail_url: editThumbnailUrl.trim() || `https://img.youtube.com/vi/${editingVideo.youtube_video_id}/hqdefault.jpg`,
        })
        .eq('id', editingVideo.id);

      if (error) throw error;

      setEditingVideo(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour de la miniature.');
    } finally {
      setUpdatingThumbnail(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette vidéo démo ?')) return;
    try {
      await supabase.from('videos').delete().eq('id', id);
      setVideos(videos.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <SeoHead title="Mes Vidéos Démo • Dashboard ManuX" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif-heading">
            Mes vidéos de démonstration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Publiez des vidéos explicatives de vos produits Chariow pour convaincre les acheteurs
          </p>
        </div>

        <Button
          variant="chariow"
          size="sm"
          onClick={() => navigate('/dashboard/products?openModal=true')}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Ajouter une vidéo démo
        </Button>
      </div>

      {/* Videos List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Chargement de vos démonstrations vidéo...
        </div>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((vid) => (
            <Card key={vid.id} className="overflow-hidden flex flex-col justify-between border-slate-200/80">
              <div className="aspect-video relative bg-slate-950">
                <img
                  src={vid.thumbnail_url || `https://img.youtube.com/vi/${vid.youtube_video_id}/hqdefault.jpg`}
                  alt={vid.title}
                  className="w-full h-full object-cover"
                />
                <a
                  href={vid.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-md">
                    <Play className="w-4 h-4 ml-0.5 fill-current" />
                  </div>
                </a>

                {/* Pro Thumbnail Badge if custom */}
                {isProPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVideo(vid);
                      setEditThumbnailUrl(vid.thumbnail_url || '');
                    }}
                    title="Personnaliser la miniature (Réservé au Plan Pro)"
                    className="absolute top-2 right-2 bg-slate-950/80 hover:bg-slate-950 text-amber-400 p-1.5 rounded-lg text-xs flex items-center gap-1 backdrop-blur-xs transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span className="text-[10px] font-bold">Miniature Pro</span>
                  </button>
                )}
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                    {vid.title}
                  </h3>
                  {vid.product && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      Produit lié : {vid.product.title}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>ID : {vid.youtube_video_id}</span>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/videos/${vid.slug}`}
                      className="p-1 text-slate-500 hover:text-amber-600 rounded transition-colors"
                      title="Voir sur ManuX"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(vid.id)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center space-y-3 border-slate-200/80">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <VideoIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Aucune vidéo démo pour le moment</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ajoutez une vidéo YouTube non répertoriée ou publique pour démontrer vos produits et décupler vos ventes.
          </p>
          <Button variant="chariow" size="sm" onClick={() => navigate('/dashboard/products?openModal=true')}>
            Ajouter ma première vidéo
          </Button>
        </Card>
      )}

      {/* Add Video Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Ajouter une vidéo démo
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateVideo} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Titre de la vidéo *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Démonstration pratique du template Chariow"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Lien YouTube *</label>
                <input
                  type="url"
                  required
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtu.be/... ou https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500">
                  Mode « Non répertorié » ou « Public » sur YouTube.
                </p>
              </div>

              {/* Custom Thumbnail: Restricted to PRO Plan (9 USD/month) */}
              <div className="space-y-1 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>Miniature personnalisée</span>
                  </label>
                  {isProPlan ? (
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                      PLAN PRO ACTIF
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Plan Pro (9 $/mois)
                    </span>
                  )}
                </div>

                {isProPlan ? (
                  <div className="space-y-1 pt-1">
                    <input
                      type="url"
                      value={customThumbnailUrl}
                      onChange={(e) => setCustomThumbnailUrl(e.target.value)}
                      placeholder="https://... URL de votre miniature personnalisée"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[10px] text-slate-500">
                      Laissez vide pour utiliser la miniature officielle YouTube par défaut.
                    </p>
                  </div>
                ) : (
                  <div className="pt-1 text-xs text-slate-600 space-y-1.5">
                    <p className="text-[11px] leading-relaxed">
                      La personnalisation de la miniature de vidéo est exclusivement disponible pour les abonnés au <strong>Plan Pro (9 $/mois)</strong>. La miniature haute définition de votre vidéo YouTube sera automatiquement utilisée.
                    </p>
                    <Link
                      to="/dashboard/subscription"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800"
                    >
                      <span>Passer au Plan Pro 9 $/mois</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Associer à un produit Chariow</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-amber-400"
                >
                  <option value="">Aucun produit associé (démonstration générale)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.price} {p.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Que présente cette démonstration ?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button variant="chariow" size="sm" type="submit" isLoading={saving}>
                  Enregistrer la vidéo
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Pro Thumbnail Modal */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Modifier la miniature (Plan Pro)</span>
              </h3>
              <button onClick={() => setEditingVideo(null)} className="text-slate-400 hover:text-slate-700 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditThumbnail} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">URL de l'image miniature</label>
                <input
                  type="url"
                  value={editThumbnailUrl}
                  onChange={(e) => setEditThumbnailUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... ou votre image hébergée"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-amber-400"
                />
              </div>

              {editThumbnailUrl && (
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img src={editThumbnailUrl} alt="Aperçu miniature" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setEditingVideo(null)}>
                  Annuler
                </Button>
                <Button variant="chariow" size="sm" type="submit" isLoading={updatingThumbnail}>
                  Sauvegarder
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
