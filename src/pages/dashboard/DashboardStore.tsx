import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store as StoreIcon,
  ExternalLink,
  Key,
  CheckCircle2,
  AlertCircle,
  Download,
  Package,
  Check,
  Eye,
  EyeOff,
  X,
  Trash2,
  Sparkles,
  Plus,
  RefreshCw,
  Lock,
  Edit2,
  Copy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Store as StoreType } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SeoHead } from '../../components/ui/SeoHead';
import { TikTokLoader } from '../../components/ui/TikTokLoader';
import { ChariowConnector, ChariowProductNormalized } from '../../services/chariow';
import { CurrencyService } from '../../services/currency';
import { CacheService } from '../../services/cacheService';

export const DashboardStore: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Stores state (all stores belonging to this creator from Supabase)
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // New store form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStoreUrl, setNewStoreUrl] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [savingNew, setSavingNew] = useState(false);

  // Edit store form state
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [editName, setEditName] = useState('');
  const [editStoreUrl, setEditStoreUrl] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [showEditKey, setShowEditKey] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete modal state
  const [storeToDelete, setStoreToDelete] = useState<StoreType | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Keys visibility toggle per store ID
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  // Testing connection state per store ID
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Products Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeImportStore, setActiveImportStore] = useState<StoreType | null>(null);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [importing, setImporting] = useState(false);
  const [chariowProducts, setChariowProducts] = useState<ChariowProductNormalized[]>([]);
  const [importedChariowIds, setImportedChariowIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [existingProductsCount, setExistingProductsCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Subscription plan limits: 1 API key = 1 boutique
  const plan = profile?.subscription_plan || 'free';
  const maxProducts = plan === 'pro' ? 100 : plan === 'creator' ? 20 : 3;
  const maxStores = plan === 'pro' ? 5 : plan === 'creator' ? 2 : 1;

  // Load stores and user products from Supabase
  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Load all stores from Supabase public.stores
      const { data: storesData, error: storesErr } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (storesErr) {
        console.error('[ManuX Stores] Error fetching stores:', storesErr);
      } else {
        setStores((storesData as StoreType[]) || []);
      }

      // Load user's existing products to identify already imported Chariow items
      const { data: userProds, count } = await supabase
        .from('products')
        .select('id, chariow_product_id, metadata', { count: 'exact' })
        .eq('user_id', user.id);

      if (count !== null) setExistingProductsCount(count);

      if (userProds) {
        const importedIds: string[] = [];
        userProds.forEach((p: any) => {
          if (p.chariow_product_id) importedIds.push(p.chariow_product_id);
          if (p.metadata?.chariow_id) importedIds.push(p.metadata.chariow_id);
        });
        setImportedChariowIds(importedIds);
      }
    } catch (err) {
      console.error('[ManuX Store] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Toggle API key visibility for a specific store
  const toggleKeyVisibility = (storeId: string) => {
    setVisibleKeys((prev) => ({ ...prev, [storeId]: !prev[storeId] }));
  };

  // Copy API key to clipboard
  const copyKeyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setStatusMsg({ type: 'success', text: 'Clé API copiée dans le presse-papier !' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Test Chariow API Connectivity for a specific store
  const handleTestConnection = async (st: StoreType) => {
    const key = (st as any).api_key || '';
    if (!key) {
      setTestResults((prev) => ({
        ...prev,
        [st.id]: { success: false, message: 'Aucune clé API renseignée pour cette boutique.' },
      }));
      return;
    }

    try {
      setTestingConnectionId(st.id);
      const connector = new ChariowConnector();
      const res = await connector.testConnection(key, st.external_chariow_url || undefined);
      setTestResults((prev) => ({
        ...prev,
        [st.id]: { success: res.success, message: res.message },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [st.id]: { success: false, message: 'Erreur lors du test de connexion.' },
      }));
    } finally {
      setTestingConnectionId(null);
    }
  };

  // Open import modal for a specific store
  const handleOpenImportModal = async (st: StoreType) => {
    const key = (st as any).api_key || '';
    if (!key.trim()) {
      setStatusMsg({
        type: 'error',
        text: `Veuillez d'abord renseigner une clé API Chariow valide pour la boutique "${st.name}".`,
      });
      return;
    }

    setActiveImportStore(st);
    setIsImportModalOpen(true);
    setFetchError(null);
    setChariowProducts([]);
    setSelectedProductIds([]);

    await fetchChariowProductsForStore(st);
  };

  // Fetch products from Chariow for the active store
  const fetchChariowProductsForStore = async (st: StoreType) => {
    const key = (st as any).api_key || '';
    try {
      setFetchingProducts(true);
      setFetchError(null);
      const connector = new ChariowConnector();
      const res = await connector.fetchProducts({
        apiKey: key.trim(),
        storeUrl: st.external_chariow_url || undefined,
        forceRefresh: true,
      });

      if (res.error) {
        setFetchError(res.error);
        setChariowProducts([]);
        return;
      }

      const prods = res.products || [];
      setChariowProducts(prods);

      // Preselect items not yet imported within remaining quota
      const notImported = prods.filter((p) => !importedChariowIds.includes(p.id));
      const remainingQuota = Math.max(0, maxProducts - existingProductsCount);
      setSelectedProductIds(notImported.slice(0, remainingQuota).map((p) => p.id));
    } catch (err: any) {
      setFetchError('Erreur de connexion au service Chariow. Vérifiez votre clé API.');
      setChariowProducts([]);
    } finally {
      setFetchingProducts(false);
    }
  };

  // Handle store change within the import modal
  const handleSwitchStoreInModal = async (storeId: string) => {
    const found = stores.find((s) => s.id === storeId);
    if (found) {
      setActiveImportStore(found);
      await fetchChariowProductsForStore(found);
    }
  };

  // Toggle selection of a single product
  const toggleSelectProduct = (id: string) => {
    if (importedChariowIds.includes(id)) return; // Already imported

    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((pid) => pid !== id));
    } else {
      const remainingQuota = maxProducts - existingProductsCount;
      if (selectedProductIds.length >= remainingQuota) {
        setStatusMsg({
          type: 'warning',
          text: `Votre plan ${plan.toUpperCase()} est limité à ${maxProducts} produits (${existingProductsCount} déjà publiés).`,
        });
        return;
      }
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  // Select all or deselect all
  const toggleSelectAll = () => {
    const available = chariowProducts.filter((p) => !importedChariowIds.includes(p.id));
    const remainingQuota = Math.max(0, maxProducts - existingProductsCount);

    if (selectedProductIds.length === Math.min(available.length, remainingQuota)) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(available.slice(0, remainingQuota).map((p) => p.id));
    }
  };

  // Execute import of selected products
  const handleImportSelected = async () => {
    if (!user || !activeImportStore) return;
    if (selectedProductIds.length === 0) return;

    try {
      setImporting(true);
      setStatusMsg(null);

      const toImport = chariowProducts.filter((p) => selectedProductIds.includes(p.id));
      const insertedIds: string[] = [];
      const newImportedIds = [...importedChariowIds];

      for (const item of toImport) {
        const itemTitle = item.name || (item as any).title || 'Produit Chariow';
        const slug =
          itemTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + `-${Date.now().toString().slice(-4)}`;

        const bestImage = item.display_image || (item as any).thumbnail || null;

        // Construct product URL following the creator's store URL: e.g. <store_url>/<product_id>
        const cleanStoreUrl = (activeImportStore.external_chariow_url || '').trim().replace(/\/+$/, '');
        const productStoreUrl = cleanStoreUrl && item.id
          ? `${cleanStoreUrl}/${item.id}`
          : (item.url || item.checkout_url || (item.id ? `https://chariow.com/p/${item.id}` : ''));

        const { data: insData, error: insErr } = await supabase
          .from('products')
          .insert({
            user_id: user.id,
            store_id: activeImportStore.id,
            title: itemTitle,
            slug,
            description: item.description || '',
            price: item.price || 0,
            currency: item.currency || 'USD',
            thumbnail_url: bestImage,
            main_image_url: bestImage,
            chariow_product_id: item.id,
            metadata: {
              pictures: {
                cover: (item as any).pictures?.cover || null,
                thumbnail: (item as any).pictures?.thumbnail || null,
              },
              chariow_id: item.id,
            },
            external_chariow_url: productStoreUrl,
            status: 'published',
          })
          .select('id')
          .single();

        if (insErr) throw insErr;
        if (insData?.id) {
          insertedIds.push(insData.id);
          newImportedIds.push(item.id);
        }
      }

      setExistingProductsCount((prev) => prev + toImport.length);
      setImportedChariowIds(newImportedIds);
      setSelectedProductIds([]);
      setIsImportModalOpen(false);

      // Invalidate frontend product cache so that Home feed immediately shows these newly imported products
      CacheService.invalidatePattern('home');
      CacheService.invalidatePattern('prod');

      setStatusMsg({
        type: 'success',
        text: `${toImport.length} produit(s) importé(s) avec succès depuis Chariow !`,
      });

      if (insertedIds.length > 0) {
        navigate(`/dashboard/products?imported=true`);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors de l’importation des produits.' });
    } finally {
      setImporting(false);
    }
  };

  // Add a new store to Supabase
  const handleAddNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (stores.length >= maxStores) {
      setStatusMsg({
        type: 'warning',
        text: `Limite de boutiques atteinte (${stores.length}/${maxStores} pour le Plan ${plan.toUpperCase()}).`,
      });
      return;
    }

    try {
      setSavingNew(true);
      setStatusMsg(null);

      const storeData = {
        user_id: user.id,
        name: newName.trim() || 'Ma Boutique Chariow',
        external_chariow_url: newStoreUrl.trim(),
        api_key: newApiKey.trim() || null,
        is_active: true,
        is_connected: Boolean(newApiKey.trim()),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('stores').insert(storeData).select().single();
      if (error) throw error;

      setStores((prev) => [...prev, data as StoreType]);
      setNewName('');
      setNewStoreUrl('');
      setNewApiKey('');
      setShowAddForm(false);
      setStatusMsg({
        type: 'success',
        text: `Boutique "${data.name}" et clé API enregistrées avec succès dans Supabase !`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors de l’ajout de la boutique.' });
    } finally {
      setSavingNew(false);
    }
  };

  // Open edit modal for a store
  const openEditModal = (st: StoreType) => {
    setEditingStore(st);
    setEditName(st.name || '');
    setEditStoreUrl(st.external_chariow_url || '');
    setEditApiKey((st as any).api_key || '');
  };

  // Save edited store in Supabase
  const handleSaveEditStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingStore) return;

    try {
      setSavingEdit(true);
      setStatusMsg(null);

      const updateData = {
        name: editName.trim() || editingStore.name,
        external_chariow_url: editStoreUrl.trim(),
        api_key: editApiKey.trim() || null,
        is_connected: Boolean(editApiKey.trim()),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('stores')
        .update(updateData)
        .eq('id', editingStore.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setStores((prev) => prev.map((s) => (s.id === editingStore.id ? (data as StoreType) : s)));
      setEditingStore(null);
      setStatusMsg({
        type: 'success',
        text: `Informations de la boutique "${data.name}" mises à jour avec succès !`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors de la modification.' });
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete a store from Supabase
  const handleConfirmDelete = async () => {
    if (!user || !storeToDelete) return;

    try {
      setDeleting(true);
      setStatusMsg(null);

      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeToDelete.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setStores((prev) => prev.filter((s) => s.id !== storeToDelete.id));
      setStoreToDelete(null);
      setStatusMsg({
        type: 'success',
        text: 'Boutique et clé API supprimées de votre compte avec succès.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors de la suppression.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <SeoHead title="Ma Boutique Chariow • Dashboard ManuX" />

      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 font-serif-heading">
              Mes Boutiques Chariow & Clés API
            </h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300">
              1 API = 1 Boutique
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
            Gérez vos boutiques Chariow, renseignez vos clés API officielles et importez vos catalogues de produits en direct.
          </p>
        </div>

        {stores.length < maxStores && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddForm(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Ajouter une boutique
          </Button>
        )}
      </div>

      {/* Status Notifications */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2.5 shadow-2xs ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : statusMsg.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-slate-500 hover:text-slate-800 text-xs font-bold p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Quotas & Subscription Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 sm:p-5 flex flex-col justify-between gap-3 bg-white border-slate-200">
          <div className="space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Boutiques Chariow Connectées
            </div>
            <div className="text-2xl font-black text-slate-950 flex items-baseline gap-1">
              <span>{stores.length}</span>
              <span className="text-sm font-bold text-slate-400">/ {maxStores} autorisée(s)</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>Formule : <strong className="text-slate-950 uppercase">{plan}</strong></span>
            {stores.length >= maxStores && plan !== 'pro' && (
              <Link to="/dashboard/subscription" className="text-emerald-700 font-bold hover:underline">
                Augmenter la limite →
              </Link>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col justify-between gap-3 bg-white border-slate-200">
          <div className="space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Produits Publiés sur ManuX
            </div>
            <div className="text-2xl font-black text-slate-950 flex items-baseline gap-1">
              <span>{existingProductsCount}</span>
              <span className="text-sm font-bold text-slate-400">/ {maxProducts} max</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {Math.max(0, maxProducts - existingProductsCount)} place(s) libre(s)
            </span>
            <Link to="/dashboard/products" className="text-xs font-bold text-slate-700 hover:text-emerald-700">
              Voir mes produits →
            </Link>
          </div>
        </Card>
      </div>

      {/* Stores List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-emerald-600" />
            <span>Vos Boutiques Connectées ({stores.length})</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {stores.length} sur {maxStores} configurée(s)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <TikTokLoader size="md" message="Chargement de vos boutiques Chariow..." />
          </div>
        ) : stores.length === 0 ? (
          <Card className="p-8 text-center space-y-4 bg-white border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <StoreIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-950">
                Aucune boutique Chariow connectée
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-md mx-auto">
                Connectez votre première boutique Chariow en renseignant votre URL et votre clé API secrète afin d'importer vos produits.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowAddForm(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Connecter ma boutique Chariow
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {stores.map((st, index) => {
              const currentApiKey = (st as any).api_key || '';
              const isKeyVisible = Boolean(visibleKeys[st.id]);
              const testResult = testResults[st.id];
              const isTesting = testingConnectionId === st.id;

              return (
                <Card
                  key={st.id}
                  className="p-5 sm:p-6 bg-white border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-5"
                >
                  {/* Top Bar: Title, badges, link */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black text-sm shrink-0">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-950">
                            {st.name || 'Boutique Chariow'}
                          </h3>
                          {currentApiKey ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Connectée
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              Clé manquante
                            </span>
                          )}
                        </div>
                        {st.external_chariow_url ? (
                          <a
                            href={st.external_chariow_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1 mt-0.5"
                          >
                            <span>{st.external_chariow_url}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Aucune URL Chariow renseignée</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => openEditModal(st)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5 text-slate-600" />}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setStoreToDelete(st)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>

                  {/* API Key Display & Connectivity Status */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">
                          Clé API Chariow Secrète
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentApiKey && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(st.id)}
                              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-md border border-slate-200"
                            >
                              {isKeyVisible ? (
                                <>
                                  <EyeOff className="w-3 h-3" /> Masquer
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" /> Afficher
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyKeyToClipboard(currentApiKey)}
                              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-md border border-slate-200"
                              title="Copier la clé"
                            >
                              <Copy className="w-3 h-3" /> Copier
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="font-mono text-xs font-bold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto">
                      {currentApiKey ? (
                        isKeyVisible ? (
                          currentApiKey
                        ) : (
                          `${currentApiKey.slice(0, 8)}••••••••••••••••••••••••••••${currentApiKey.slice(-4)}`
                        )
                      ) : (
                        <span className="text-amber-700 italic font-sans font-normal">
                          Aucune clé API enregistrée. Cliquez sur "Modifier" pour en ajouter une.
                        </span>
                      )}
                    </div>

                    {/* Test result display */}
                    {testResult && (
                      <div
                        className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                          testResult.success
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : 'bg-rose-100 text-rose-950 border border-rose-300'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions for this store */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(st)}
                      isLoading={isTesting}
                      disabled={!currentApiKey}
                      leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />}
                    >
                      Tester la connexion API
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenImportModal(st)}
                      disabled={!currentApiKey}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      Importer les produits de cette boutique
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Store Form (when allowed by subscription quota) */}
      {showAddForm && stores.length < maxStores && (
        <Card className="p-6 sm:p-7 bg-white border-emerald-300 ring-2 ring-emerald-500/20 shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">
                  Connecter une nouvelle boutique Chariow
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  Boutique #{stores.length + 1} (Limite autorisée : {maxStores})
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddNewStore} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">
                Nom de la boutique <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Boutique Formations & E-books"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">
                URL de la boutique Chariow <span className="text-rose-600">*</span>
              </label>
              <input
                type="url"
                required
                value={newStoreUrl}
                onChange={(e) => setNewStoreUrl(e.target.value)}
                placeholder="https://chariow.com/store/ma-boutique"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  Clé API Chariow Secrète <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewKey(!showNewKey)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  {showNewKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showNewKey ? 'Masquer' : 'Afficher'}</span>
                </button>
              </div>
              <input
                type={showNewKey ? 'text' : 'password'}
                required
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="chariow_sec_key_..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold font-mono rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600 bg-slate-50 shadow-xs"
              />
              <p className="text-[11px] text-slate-500">
                Entrez votre clé secrète API Chariow fournie dans votre espace boutique Chariow.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowAddForm(false)}
                disabled={savingNew}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={savingNew}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Valider & Enregistrer dans Supabase
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Subscription Upsell / Secondary Store Locked Card */}
      {stores.length >= maxStores && plan === 'free' && (
        <Card className="p-6 sm:p-7 bg-linear-to-br from-amber-50/70 via-white to-emerald-50/40 border-amber-300/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-950">
                    Ajouter une seconde boutique Chariow
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                    Réservé Créateur & Pro
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 max-w-xl">
                  Le Plan Gratuit est limité à <strong>1 boutique Chariow</strong> (1 clé API). Pour ajouter une seconde boutique ou gérer plusieurs catalogues Chariow simultanément, passez au Plan Créateur (2 boutiques) ou au Plan Pro (5 boutiques).
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/dashboard/subscription')}
              className="bg-amber-600 hover:bg-amber-700 text-white border-transparent shrink-0 shadow-xs"
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Passer au Plan Créateur ($2.50/mois)
            </Button>
          </div>
        </Card>
      )}

      {/* Quota reached info for Creator plan */}
      {stores.length >= maxStores && plan === 'creator' && (
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-semibold">
            <StoreIcon className="w-4 h-4 text-emerald-600" />
            <span>
              Limite de <strong>2 boutiques Chariow</strong> atteinte pour le Plan Créateur.
            </span>
          </div>
          <Link
            to="/dashboard/subscription"
            className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
          >
            Débloquer jusqu'à 5 boutiques avec le Plan Pro ($9/mois) →
          </Link>
        </div>
      )}

      {/* Edit Store Modal */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    Modifier la boutique
                  </h3>
                  <p className="text-xs text-slate-500">Mise à jour dans Supabase</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStore(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStore} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900">Nom de la boutique</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900">URL Chariow</label>
                <input
                  type="url"
                  required
                  value={editStoreUrl}
                  onChange={(e) => setEditStoreUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">Clé API Chariow Secrète</label>
                  <button
                    type="button"
                    onClick={() => setShowEditKey(!showEditKey)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    {showEditKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showEditKey ? 'Masquer' : 'Afficher'}</span>
                  </button>
                </div>
                <input
                  type={showEditKey ? 'text' : 'password'}
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                  placeholder="sk_live_..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-300 text-slate-950 outline-none focus:border-emerald-600 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setEditingStore(null)}
                  disabled={savingEdit}
                >
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={savingEdit}>
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">
                  Supprimer la boutique "{storeToDelete.name}" ?
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cette action effacera cette boutique et sa clé API de votre base Supabase.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStoreToDelete(null)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
              >
                Oui, supprimer définitivement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Chariow Products Import */}
      {isImportModalOpen && activeImportStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    Importer depuis Chariow
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
                    <span>Boutique :</span>
                    {stores.length > 1 ? (
                      <select
                        value={activeImportStore.id}
                        onChange={(e) => handleSwitchStoreInModal(e.target.value)}
                        className="font-bold text-slate-950 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none"
                      >
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <strong className="font-bold text-slate-950">{activeImportStore.name}</strong>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Quota Bar */}
            <div className="px-5 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs font-semibold text-emerald-950">
              <div className="flex items-center gap-2">
                <span>Quota disponible :</span>
                <strong>
                  {Math.max(0, maxProducts - existingProductsCount)} place(s) restante(s) sur {maxProducts} (Plan {plan.toUpperCase()})
                </strong>
              </div>
              {chariowProducts.length > 0 && !fetchingProducts && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                >
                  {selectedProductIds.length ===
                  Math.min(
                    chariowProducts.filter((p) => !importedChariowIds.includes(p.id)).length,
                    Math.max(0, maxProducts - existingProductsCount)
                  )
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {fetchingProducts ? (
                <div className="p-12 text-center">
                  <TikTokLoader
                    size="md"
                    message="Connexion à l'API Chariow avec la clé de votre boutique..."
                  />
                </div>
              ) : fetchError ? (
                <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-rose-950">{fetchError}</p>
                    <p className="text-xs text-rose-700">
                      Vérifiez que votre clé API Chariow est correcte et active, et que votre boutique Chariow est publiée.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchChariowProductsForStore(activeImportStore)}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Réessayer
                  </Button>
                </div>
              ) : chariowProducts.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Package className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">
                    Aucun produit trouvé sur cette boutique Chariow.
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Vérifiez que vous avez créé et publié des articles sur votre espace vendeur Chariow.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchChariowProductsForStore(activeImportStore)}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    className="mt-2"
                  >
                    Actualiser
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {chariowProducts.map((prod) => {
                    const isAlreadyImported = importedChariowIds.includes(prod.id);
                    const isSelected = selectedProductIds.includes(prod.id);
                    const prodImage = prod.display_image || (prod as any).thumbnail || null;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleSelectProduct(prod.id)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isAlreadyImported
                            ? 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-1 ring-emerald-500 cursor-pointer'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox / Status */}
                          {!isAlreadyImported ? (
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                            {prodImage ? (
                              <img
                                src={prodImage}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="truncate min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-bold text-slate-950 truncate">
                              {prod.name || (prod as any).title || 'Produit Chariow'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 font-black text-xs border border-amber-300">
                                Montant API : {prod.price !== undefined && prod.price !== null ? `${prod.price} ${prod.currency || 'USD'}` : '0 USD'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Tag */}
                        {isAlreadyImported ? (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 shrink-0">
                            Déjà importé sur ManuX
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 shrink-0">
                            Prêt à importer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-600">
                Sélectionné(s) : <strong className="text-slate-950 font-bold">{selectedProductIds.length}</strong>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
                  Fermer
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleImportSelected}
                  isLoading={importing}
                  disabled={selectedProductIds.length === 0 || fetchingProducts}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Importer la sélection ({selectedProductIds.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
