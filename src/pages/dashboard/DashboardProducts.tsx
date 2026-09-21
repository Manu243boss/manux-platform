import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ExternalLink,
  Package,
  AlertCircle,
  Edit,
  Video as VideoIcon,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Tag,
  FileText,
  PlaySquare,
  Lock,
  X,
  Eye,
  RefreshCw,
  Download,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Product, Category } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SeoHead } from '../../components/ui/SeoHead';
import { ChariowConnector } from '../../services/chariow';
import { CurrencyService } from '../../services/currency';
import { StorageService } from '../../services/storage';
import { CountryService, CountryData, DEFAULT_COUNTRIES } from '../../services/countries';
import { CacheService } from '../../services/cacheService';
import { CurrencyCountryModal } from '../../components/ui/CurrencyCountryModal';

export const DashboardProducts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countriesList, setCountriesList] = useState<CountryData[]>(DEFAULT_COUNTRIES);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('XOF');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [secondaryImageUrl, setSecondaryImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSecondary, setUploadingSecondary] = useState(false);

  // Action states
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Plan info
  const plan = profile?.subscription_plan || 'free';
  const maxProducts = plan === 'pro' ? 100 : plan === 'creator' ? 20 : 3;
  const canUploadCustomThumbnails = true; // Always allow direct WebP uploads for full creator autonomy

  // Saturated Tip banner state for imported products
  const [importedTipDismissed, setImportedTipDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('manux_imported_tip_dismissed') === 'true';
  });

  const dismissImportedTip = () => {
    setImportedTipDismissed(true);
    sessionStorage.setItem('manux_imported_tip_dismissed', 'true');
  };

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [pRes, cRes, countries] = await Promise.all([
        supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        CountryService.getCountries(),
      ]);
      if (pRes.data) {
        setProducts(pRes.data);

        // Check if coming from Chariow import or edit link
        const editId = searchParams.get('edit');
        const stepParam = searchParams.get('step');
        const isImported = searchParams.get('imported') === 'true';

        if (editId) {
          const prodToEdit = pRes.data.find((p: Product) => p.id === editId);
          if (prodToEdit) {
            openEditModal(prodToEdit);
            if (stepParam) {
              setCurrentStep(parseInt(stepParam, 10) || 5);
            }
            if (isImported) {
              setStatusMsg({
                type: 'success',
                text: 'Produit Chariow importé ! Téléversez maintenant votre miniature et votre deuxième photo depuis votre appareil (converties automatiquement en WebP).',
              });
            }
          }
        }
      }
      if (cRes.data) setCategories(cRes.data);
      if (countries && countries.length > 0) setCountriesList(countries);
    } catch (err) {
      console.error('[ManuX Products] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const userDefaultCurrency = (profile as any)?.currency || (profile?.metadata as any)?.currency || 'XOF';

  const openAddModal = () => {
    setEditingProductId(null);
    setTitle('');
    setPrice('');
    setCurrency(userDefaultCurrency);
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setExternalUrl('');
    setVideoUrl('');
    setImageUrl('');
    setThumbnailUrl('');
    setSecondaryImageUrl('');
    setCurrentStep(1);
    setStatusMsg(null);
    setShowModal(true);
  };

  useEffect(() => {
    if (!loading && searchParams.get('openModal') === 'true') {
      openAddModal();
      searchParams.delete('openModal');
      setSearchParams(searchParams);
    }
  }, [loading, searchParams]);

  const openEditModal = (prod: Product) => {
    setEditingProductId(prod.id);
    setTitle(prod.title);
    setPrice(prod.price ? String(prod.price) : '');
    setCurrency(prod.currency || userDefaultCurrency);
    setCategoryId(prod.category_id || '');
    setDescription(prod.description || '');
    setExternalUrl(prod.external_chariow_url || '');
    setVideoUrl((prod.metadata as any)?.video_url || '');
    setImageUrl(prod.main_image_url || '');
    setThumbnailUrl(prod.thumbnail_url || '');
    setSecondaryImageUrl(prod.secondary_image_url || (prod.metadata as any)?.secondary_image_url || '');
    setCurrentStep(1);
    setStatusMsg(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProductId(null);
    setStatusMsg(null);
    // Clear URL edit params
    if (searchParams.get('edit')) {
      searchParams.delete('edit');
      searchParams.delete('step');
      searchParams.delete('imported');
      setSearchParams(searchParams);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isThumbnail: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setStatusMsg(null);
      const res = await StorageService.uploadImage(file, 'product-images');
      if (res.error) {
        setStatusMsg({ type: 'error', text: res.error });
      } else if (res.url) {
        if (isThumbnail) {
          setThumbnailUrl(res.url);
        } else {
          setImageUrl(res.url);
          if (!thumbnailUrl) setThumbnailUrl(res.url);
        }
        setStatusMsg({ type: 'success', text: 'Miniature principale téléversée et convertie en WebP avec succès !' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors du téléversement.' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSecondaryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingSecondary(true);
      setStatusMsg(null);
      const res = await StorageService.uploadImage(file, 'product-images');
      if (res.error) {
        setStatusMsg({ type: 'error', text: res.error });
      } else if (res.url) {
        setSecondaryImageUrl(res.url);
        setStatusMsg({ type: 'success', text: 'Deuxième photo téléversée et convertie en WebP avec succès !' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors du téléversement de la deuxième photo.' });
    } finally {
      setUploadingSecondary(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim() || !price) {
      setStatusMsg({ type: 'error', text: 'Veuillez renseigner au moins le titre et le prix officiel du produit.' });
      setCurrentStep(1);
      return;
    }

    try {
      setSaving(true);
      setStatusMsg(null);

      // Check quota only for creation
      if (!editingProductId && products.length >= maxProducts) {
        setStatusMsg({
          type: 'warning',
          text: `Limite de votre plan ${plan.toUpperCase()} atteinte (${maxProducts} produits max). Passez au plan supérieur pour publier plus d'articles.`,
        });
        setSaving(false);
        return;
      }

      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + `-${Date.now().toString().slice(-4)}`;

      // Extract YouTube Video ID if provided
      const ytId = videoUrl.trim() ? ChariowConnector.extractYouTubeId(videoUrl.trim()) : null;

      const productPayload: any = {
        user_id: user.id,
        title: title.trim(),
        price: parseFloat(price) || 0,
        currency,
        category_id: categoryId || null,
        description: description.trim(),
        external_chariow_url: externalUrl.trim() || null,
        main_image_url: imageUrl.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || imageUrl.trim() || null,
        secondary_image_url: secondaryImageUrl.trim() || null,
        status: 'published',
        metadata: {
          video_url: videoUrl.trim() || null,
          youtube_video_id: ytId,
          secondary_image_url: secondaryImageUrl.trim() || null,
        },
      };

      if (editingProductId) {
        // UPDATE
        productPayload.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', editingProductId)
          .eq('user_id', user.id);

        if (error) throw error;
        setStatusMsg({ type: 'success', text: 'Produit modifié avec succès !' });
      } else {
        // INSERT
        productPayload.slug = slug;
        const { data: inserted, error } = await supabase.from('products').insert(productPayload).select().single();
        if (error) throw error;

        // If video provided and user has rights, register video in database
        if (ytId && inserted) {
          await supabase.from('videos').insert({
            user_id: user.id,
            product_id: inserted.id,
            youtube_url: videoUrl.trim(),
            youtube_video_id: ytId,
            title: `Démonstration : ${title.trim()}`,
            slug: `demo-${slug}`,
            description: description.trim(),
            thumbnail_url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
            is_unlisted_demo: true,
            status: 'published',
          });
        }
      }

      // Invalidate frontend cache so that updated prices are instantly shown on Home and everywhere
      CacheService.invalidatePattern('home');
      CacheService.invalidatePattern('prod');

      await loadData();
      closeModal();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors de la sauvegarde du produit.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer définitivement ce produit de votre vitrine ManuX ?')) {
      return;
    }

    try {
      setDeletingId(id);
      // Delete associated videos first to avoid foreign key issues
      await supabase.from('videos').delete().eq('product_id', id);
      // Delete product from Supabase
      const { error } = await supabase.from('products').delete().eq('id', id).eq('user_id', user?.id);
      if (error) throw error;

      CacheService.invalidatePattern('home');
      CacheService.invalidatePattern('prod');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(`Erreur lors de la suppression: ${err.message || err}`);
    } finally {
      setDeletingId(null);
    }
  };

  const steps = [
    { num: 1, title: 'Titre & Prix', icon: DollarSign, desc: 'Identité et tarification' },
    { num: 2, title: 'Catégorie', icon: Tag, desc: 'Classement thématique' },
    { num: 3, title: 'Lien Chariow', icon: ExternalLink, desc: 'Lien d’achat officiel' },
    { num: 4, title: 'Vidéo Démo', icon: PlaySquare, desc: 'Démonstration YouTube' },
    { num: 5, title: 'Visuels & Infos', icon: ImageIcon, desc: 'Miniature & description' },
    { num: 6, title: 'Finaliser', icon: Sparkles, desc: 'Aperçu & publication' },
  ];

  const latestImportedProduct = products.find(
    (p) => Boolean((p.metadata as any)?.chariow_id || p.chariow_product_id)
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <SeoHead title="Mes Produits - Dashboard" />

      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 font-serif-heading">
              Mes Produits & Formations
            </h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300">
              {products.length} / {maxProducts} Produits
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
            Gérez votre catalogue de produits, importez depuis Chariow ou ajoutez de nouveaux articles avec vidéos de démonstration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/store')}
            className="border-emerald-300 text-emerald-950 bg-emerald-50/60 hover:bg-emerald-100"
            leftIcon={<Download className="w-4 h-4 text-emerald-700" />}
          >
            Importer depuis Chariow
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            leftIcon={<Plus className="w-4 h-4" />}
            disabled={products.length >= maxProducts && plan !== 'pro'}
          >
            Ajouter un produit
          </Button>
        </div>
      </div>

      {/* Saturated Advice Tip Banner on Imported Products */}
      {latestImportedProduct && !importedTipDismissed && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 border-2 border-amber-500 rounded-2xl p-4 sm:p-5 shadow-lg text-slate-950 animate-in slide-in-from-top-2 duration-300">
          <button
            type="button"
            onClick={dismissImportedTip}
            aria-label="Fermer cette astuce"
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pr-7">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-950 text-amber-300">
                  <Sparkles className="w-3 h-3" />
                  Conseil Stratégique ManuX
                </span>
                <span className="text-xs font-black text-slate-900 underline underline-offset-2">
                  Produit importé détecté
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-950 leading-snug">
                Maintenant, nous vous conseillons vivement de modifier votre produit importé pour y ajouter une vidéo de démonstration YouTube, une miniature HD et ajuster votre description afin de maximiser vos ventes sur Chariow !
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => openEditModal(latestImportedProduct)}
              className="shrink-0 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs shadow-md border-0 cursor-pointer"
              leftIcon={<Edit className="w-3.5 h-3.5 text-amber-400" />}
            >
              Modifier ce produit importé
            </Button>
          </div>
        </div>
      )}

      {/* Quota Progress Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-slate-700">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Quota actuel : <strong>{products.length}</strong> sur <strong>{maxProducts}</strong> produits autorisés (Plan <strong className="uppercase">{plan}</strong>).
          </span>
        </div>
        {products.length >= maxProducts && plan !== 'pro' && (
          <a href="/dashboard/subscription" className="text-amber-700 font-bold hover:underline">
            Passer au plan supérieur pour plus de produits →
          </a>
        )}
      </div>

      {/* Products Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-bold flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Chargement de vos produits...</span>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {products.map((prod) => {
            const hasVideo = Boolean((prod.metadata as any)?.youtube_video_id || (prod.metadata as any)?.video_url);
            const isImported = Boolean((prod.metadata as any)?.chariow_id || prod.chariow_product_id);

            return (
              <Card
                key={prod.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                    {prod.thumbnail_url || prod.main_image_url ? (
                      <img
                        src={prod.thumbnail_url || prod.main_image_url || ''}
                        alt={prod.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {isImported ? 'Import Chariow' : 'Création ManuX'}
                      </span>
                      {hasVideo ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <VideoIcon className="w-2.5 h-2.5" />
                          <span>Vidéo Démo</span>
                        </span>
                      ) : isImported ? (
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950 hover:bg-amber-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Cliquez pour ajouter une vidéo démo"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Conseil : Ajouter vidéo démo</span>
                        </button>
                      ) : null}
                      {prod.category && (
                        <span className="text-[10px] font-bold text-slate-500">
                          • {prod.category.name}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-950 line-clamp-1">
                      {prod.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs font-black text-amber-700 mt-1">
                      <span>{CurrencyService.formatOriginal(prod.price, prod.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {prod.external_chariow_url && (
                    <a
                      href={prod.external_chariow_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-2xs transition-colors"
                      title="Ouvrir la page de vente Chariow"
                    >
                      <span>Lien Chariow</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => openEditModal(prod)}
                    className="p-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Modifier ce produit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    disabled={deletingId === prod.id}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    title={deletingId === prod.id ? 'Suppression en cours dans la base de données...' : 'Supprimer définitivement'}
                  >
                    {deletingId === prod.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-3 bg-white border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Aucun produit pour le moment.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ajoutez votre premier produit manuellement ou connectez votre boutique Chariow pour synchroniser votre catalogue.
          </p>
          <Button variant="primary" size="sm" onClick={openAddModal}>
            Ajouter mon premier produit
          </Button>
        </Card>
      )}

      {/* HORIZONTAL MULTI-STEP PRODUCT MODAL WITH SIDEBAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[100] flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl flex flex-col md:flex-row overflow-hidden sm:rounded-3xl shadow-2xl">
            
            {/* Mobile Header / Stepper (visible on mobile only) */}
            <div className="md:hidden bg-slate-50 border-b border-slate-200 p-3.5 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  {editingProductId ? 'Édition Produit' : 'Nouveau Produit'} • Étape {currentStep}/6
                </div>
                <div className="text-xs font-black text-slate-950 truncate">
                  {steps[currentStep - 1].title}
                </div>
              </div>

              {/* Step indicator pills */}
              <div className="flex items-center gap-1">
                {steps.map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setCurrentStep(s.num)}
                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                      currentStep === s.num
                        ? 'bg-emerald-600 text-white'
                        : currentStep > s.num
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {s.num}
                  </button>
                ))}
              </div>

              <button
                onClick={closeModal}
                className="p-1.5 ml-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Left Sidebar (Steps Navigation on desktop) */}
            <div className="hidden md:flex w-64 bg-slate-50 p-6 border-r border-slate-200 flex-col justify-between shrink-0">
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    {editingProductId ? 'Édition Produit' : 'Nouveau Produit'}
                  </div>
                  <h3 className="text-base font-black text-slate-950 font-serif-heading mt-0.5">
                    {editingProductId ? 'Modifier l’article' : 'Assistant Publication'}
                  </h3>
                </div>

                {/* Steps List */}
                <nav className="space-y-1.5">
                  {steps.map((s) => {
                    const Icon = s.icon;
                    const isActive = currentStep === s.num;
                    const isPassed = currentStep > s.num;

                    return (
                      <button
                        key={s.num}
                        type="button"
                        onClick={() => setCurrentStep(s.num)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                          isActive
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : isPassed
                            ? 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 font-semibold'
                            : 'text-slate-600 hover:bg-slate-200/60 font-medium'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : isPassed
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs truncate">{s.title}</div>
                          <div className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {s.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500">
                  Formule active : <strong className="text-slate-900 uppercase">{plan}</strong>
                </div>
              </div>
            </div>

            {/* Modal Right Content (Active Step Form) */}
            <div className="flex-1 p-4 pb-20 sm:p-7 flex flex-col justify-between overflow-y-auto bg-white">
              <div>
                {/* Desktop Top bar */}
                <div className="hidden md:flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-slate-400">Étape {currentStep}/6 :</span>
                    <span className="text-sm font-black text-slate-950">{steps[currentStep - 1].title}</span>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Notifications in modal */}
                {statusMsg && (
                  <div
                    className={`mb-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-2xs ${
                      statusMsg.type === 'success'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : statusMsg.type === 'warning'
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}
                  >
                    {statusMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
                    )}
                    <span>{statusMsg.text}</span>
                  </div>
                )}

                {/* Step 1: Titre & Prix */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-900">
                        Titre du produit ou formation <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Formation Complète Chariow & E-commerce en Afrique"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600 shadow-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-900">
                          Prix officiel <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="15000"
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600 shadow-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>Devise du produit <span className="text-rose-600">*</span></span>
                          <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            ✨ Configurable
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCurrencyModal(true)}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 hover:border-amber-400 text-slate-950 bg-white hover:bg-amber-50/20 transition-all text-left shadow-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">
                              {countriesList.find((c) => c.currencyCode === currency)?.flagEmoji || '🌍'}
                            </span>
                            <span>
                              {countriesList.find((c) => c.currencyCode === currency)?.currencyName || 'Devise'} ({currency})
                            </span>
                          </div>
                          <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                            Changer
                          </span>
                        </button>
                        <p className="text-[10px] font-semibold text-slate-500 mt-1">
                          Cliquez pour choisir la devise dans laquelle vous vendez ce produit sur Chariow.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Catégorie */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-900">
                        Catégorie de classement <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 bg-white outline-none focus:border-emerald-600 shadow-xs"
                      >
                        <option value="">Sélectionner une catégorie...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        Permet aux acheteurs de retrouver votre produit dans le flux Découvrir et lors des recherches thématiques.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Lien direct Chariow */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-900">
                        Lien direct de commande / Checkout Chariow
                      </label>
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://chariow.com/buy/votre-produit ou https://chariow.com/store/..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600 shadow-xs"
                      />
                      <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        Lorsque les visiteurs cliquent sur « Acheter sur Chariow », ils seront directement redirigés vers ce lien sécurisé.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Vidéo Démo YouTube */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-900">
                        Lien de vidéo démonstration (YouTube)
                      </label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600 shadow-xs"
                      />
                      <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        Idéal pour une vidéo non-répertoriée expliquant le fonctionnement du produit, son contenu et ses bénéfices.
                      </p>
                    </div>

                    {videoUrl && ChariowConnector.extractYouTubeId(videoUrl) && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                        <img
                          src={`https://img.youtube.com/vi/${ChariowConnector.extractYouTubeId(videoUrl)}/hqdefault.jpg`}
                          alt="Thumbnail YouTube"
                          className="w-20 h-12 object-cover rounded-lg border border-slate-300"
                        />
                        <div className="text-xs font-bold text-emerald-800">
                          Vidéo YouTube reconnue avec succès !
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Description & Photos (Miniature WebP & 2ème Photo) */}
                {currentStep === 5 && (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-900">Description détaillée</label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Expliquez clairement ce que l'acheteur obtiendra..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600 shadow-xs"
                      />
                    </div>

                    {/* Photo 1: Miniature / Image Principale */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                            1
                          </span>
                          <label className="text-xs font-black text-slate-900">
                            Miniature & Photo Principale
                          </label>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                          WebP Auto
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => {
                            setImageUrl(e.target.value);
                            if (!thumbnailUrl) setThumbnailUrl(e.target.value);
                          }}
                          placeholder="https://... (URL de l’image)"
                          className="flex-1 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-950 outline-none focus:border-emerald-600 shadow-xs"
                        />

                        <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer shrink-0 shadow-sm">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingImage ? 'Conversion WebP...' : 'Téléverser Photo 1'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, false)}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {imageUrl && (
                        <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200">
                          <img
                            src={imageUrl}
                            alt="Photo 1"
                            className="w-14 h-14 object-cover rounded-lg border border-slate-300 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">Photo Principale prête</p>
                            <p className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Optimisée et stockée en WebP
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setImageUrl('');
                              setThumbnailUrl('');
                            }}
                            className="text-xs font-bold text-rose-600 hover:underline px-2 py-1"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Photo 2: Deuxième Photo Complémentaire */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center">
                            2
                          </span>
                          <div>
                            <label className="text-xs font-black text-slate-900">
                              Deuxième Photo Complémentaire
                            </label>
                            <span className="text-[11px] font-semibold text-slate-500 block">
                              Affichée directement en dessous de la première sur la page produit
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                          WebP Auto
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="url"
                          value={secondaryImageUrl}
                          onChange={(e) => setSecondaryImageUrl(e.target.value)}
                          placeholder="https://... (URL 2ème photo)"
                          className="flex-1 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-950 outline-none focus:border-emerald-600 shadow-xs"
                        />

                        <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer shrink-0 shadow-sm">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingSecondary ? 'Conversion WebP...' : 'Téléverser Photo 2'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSecondaryImageUpload}
                            disabled={uploadingSecondary}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {secondaryImageUrl && (
                        <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200">
                          <img
                            src={secondaryImageUrl}
                            alt="Photo 2"
                            className="w-14 h-14 object-cover rounded-lg border border-slate-300 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">Photo secondaire prête</p>
                            <p className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Optimisée et stockée en WebP
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSecondaryImageUrl('')}
                            className="text-xs font-bold text-rose-600 hover:underline px-2 py-1"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 6: Récapitulatif & Publication */}
                {currentStep === 6 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <div className="text-xs font-black uppercase text-slate-500 tracking-wider">
                        Aperçu & Récapitulatif des Métadonnées
                      </div>

                      {/* Header Identity card */}
                      <div className="flex items-start gap-4 pb-3 border-b border-slate-200">
                        <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden border border-slate-300 shrink-0 flex items-center justify-center">
                          {imageUrl || thumbnailUrl ? (
                            <img src={imageUrl || thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-slate-950">{title || 'Sans titre'}</h4>
                          <div className="text-xs font-extrabold text-amber-700 mt-0.5">
                            {CurrencyService.formatOriginal(parseFloat(price) || 0, currency)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 mt-1">
                            Catégorie : <strong className="text-slate-700">{categories.find(c => c.id === categoryId)?.name || 'Non classé'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Full Metadata Details list */}
                      <div className="space-y-3 text-xs">
                        {externalUrl ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-white rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-500 shrink-0">Lien Chariow (Boutique) :</span>
                            <span className="font-extrabold text-emerald-800 break-all text-left sm:max-w-[70%] truncate block">
                              {externalUrl}
                            </span>
                          </div>
                        ) : (
                          <div className="p-2 bg-rose-50/50 rounded-xl border border-rose-100 text-[11px] font-semibold text-rose-700">
                            ⚠️ Aucun lien direct Chariow n'a été configuré.
                          </div>
                        )}

                        {videoUrl ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-white rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-500 shrink-0">Vidéo de Démonstration :</span>
                            <span className="font-extrabold text-rose-700 break-all text-right sm:max-w-[70%] truncate block">
                              {videoUrl}
                            </span>
                          </div>
                        ) : (
                          <div className="p-2 bg-amber-50/50 rounded-xl border border-amber-100 text-[11px] font-semibold text-amber-800">
                            💡 Astuce : Ajoutez une vidéo de démonstration pour doubler vos ventes !
                          </div>
                        )}

                        {secondaryImageUrl ? (
                          <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                            <img src={secondaryImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border" />
                            <span className="font-bold text-slate-500">Deuxième Photo Complémentaire configurée</span>
                          </div>
                        ) : null}

                        {description ? (
                          <div className="space-y-1 p-2 bg-white rounded-xl border border-slate-200">
                            <div className="font-bold text-slate-500">Description détaillée :</div>
                            <p className="text-slate-800 font-medium line-clamp-3 leading-relaxed whitespace-pre-wrap">
                              {description}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Bottom Controls */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
                {currentStep > 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                    leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                  >
                    Précédent
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" type="button" onClick={closeModal}>
                    Annuler
                  </Button>
                )}

                {currentStep < 6 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Suivant
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    type="button"
                    onClick={handleSaveProduct}
                    isLoading={saving}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    {editingProductId ? 'Mettre à jour le produit' : 'Publier le produit'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showCurrencyModal && (
        <CurrencyCountryModal
          isOpen={showCurrencyModal}
          onClose={() => setShowCurrencyModal(false)}
          onSelectCountry={(country) => setCurrency(country.currencyCode)}
          selectedCountryCode={countriesList.find((c) => c.currencyCode === currency)?.code}
          title="Devise du produit"
          subtitle="Choisissez la devise officielle pour l'affichage de ce produit"
        />
      )}
    </div>
  );
};
