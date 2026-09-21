import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock,
  Shield,
  Key,
  Plus,
  Store,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  User,
  Globe,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SeoHead } from '../../components/ui/SeoHead';
import { CountrySelector } from '../../components/ui/CountrySelector';
import { CountryService, CountryData } from '../../services/countries';
import { Store as StoreType } from '../../types';

export const DashboardSettings: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();

  // Stores & API Keys list
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  // Add new store modal / form
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreUrl, setNewStoreUrl] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [showUpgradeNotice, setShowUpgradeNotice] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('XOF');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Live countries and currencies from public online API (RestCountries)
  const [countriesList, setCountriesList] = useState<CountryData[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadLiveCountries() {
      const list = await CountryService.getCountries();
      if (mounted && list && list.length > 0) {
        setCountriesList(list);
      }
    }
    loadLiveCountries();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute unique currencies directly from the live online API countries data
  const uniqueCurrencies = useMemo(() => {
    const map = new Map<string, { code: string; name: string; symbol: string; flags: string[]; sampleCountry: string }>();
    
    // Prioritize African and major currencies first
    const priorityCodes = ['CDF', 'XOF', 'XAF', 'USD', 'EUR', 'NGN', 'KES', 'GHS', 'GNF', 'RWF', 'MAD', 'ZAR', 'CAD', 'GBP'];

    for (const c of countriesList) {
      if (!c.currencyCode) continue;
      const code = c.currencyCode.toUpperCase();
      if (!map.has(code)) {
        map.set(code, {
          code,
          name: c.currencyName || code,
          symbol: c.currencySymbol || code,
          flags: [c.flagEmoji || '🏳️'],
          sampleCountry: c.name,
        });
      } else {
        const item = map.get(code)!;
        if (item.flags.length < 3 && c.flagEmoji && !item.flags.includes(c.flagEmoji)) {
          item.flags.push(c.flagEmoji);
        }
      }
    }

    const all = Array.from(map.values());
    // Sort priority currencies at the top, then alphabetically
    return all.sort((a, b) => {
      const aP = priorityCodes.indexOf(a.code);
      const bP = priorityCodes.indexOf(b.code);
      if (aP !== -1 && bP !== -1) return aP - bP;
      if (aP !== -1) return -1;
      if (bP !== -1) return 1;
      return a.code.localeCompare(b.code);
    });
  }, [countriesList]);

  // Plan limits
  const plan = profile?.subscription_plan || 'free';
  const maxStores = plan === 'pro' ? 10 : plan === 'creator' ? 2 : 1;

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setCountry(profile.country || 'Côte d’Ivoire');
      setCity(profile.city || '');
      setBio(profile.bio || '');
      const cur = (profile as any).currency || (profile.metadata as any)?.currency || 'XOF';
      setDefaultCurrency(cur);
    }
  }, [profile]);

  useEffect(() => {
    async function loadStores() {
      if (!user) return;
      try {
        setLoadingStores(true);
        const { data } = await supabase
          .from('stores')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (data) setStores(data);
      } catch (err) {
        console.error('[ManuX Settings] Error loading stores:', err);
      } finally {
        setLoadingStores(false);
      }
    }

    loadStores();
  }, [user]);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setProfileSaving(true);
      setStatusMsg(null);

      const cleanUname = username
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '');

      const currentMetadata = (profile?.metadata as any) || {};

      const { error } = await supabase.from('profiles').update({
        display_name: displayName.trim(),
        username: cleanUname,
        country,
        city: city.trim(),
        bio: bio.trim(),
        currency: defaultCurrency,
        metadata: {
          ...currentMetadata,
          currency: defaultCurrency,
        },
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      setStatusMsg({ type: 'success', text: 'Profil mis à jour avec succès !' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors de la mise à jour.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Add Store Click (enforces limits)
  const handleStartAddStore = () => {
    if (stores.length >= maxStores) {
      setShowUpgradeNotice(true);
      return;
    }
    setShowUpgradeNotice(false);
    setIsAddingStore(true);
  };

  // Submit New Store & API Key
  const handleSaveNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (stores.length >= maxStores) {
      setShowUpgradeNotice(true);
      return;
    }

    try {
      setStatusMsg(null);
      const { data, error } = await supabase.from('stores').insert({
        user_id: user.id,
        name: newStoreName.trim(),
        external_chariow_url: newStoreUrl.trim(),
        api_key: newApiKey.trim() || null,
        is_active: true,
        is_connected: Boolean(newApiKey.trim()),
      }).select().single();

      if (error) throw error;

      setStores([...stores, data]);
      setNewStoreName('');
      setNewStoreUrl('');
      setNewApiKey('');
      setIsAddingStore(false);
      setStatusMsg({ type: 'success', text: 'Nouvelle boutique Chariow et clé API ajoutées !' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors de l’ajout de la boutique.' });
    }
  };

  // Delete Store
  const handleDeleteStore = async (storeId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette boutique et détacher ses produits ?')) return;

    try {
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
      setStores(stores.filter((s) => s.id !== storeId));
      setStatusMsg({ type: 'success', text: 'Boutique supprimée avec succès.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur lors de la suppression.' });
    }
  };

  // Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'Le mot de passe doit comporter au moins 6 caractères.' });
      return;
    }

    try {
      setSavingPassword(true);
      setStatusMsg(null);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setStatusMsg({ type: 'success', text: 'Mot de passe mis à jour avec succès !' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erreur de mise à jour.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <SeoHead title="Paramètres du Compte • Dashboard ManuX" />

      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-950 font-serif-heading">
          Paramètres du Compte & Clés API
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-1">
          Gérez votre profil public, vos clés API Chariow, vos boutiques et vos identifiants de sécurité.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 shadow-2xs ${
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

      {/* SECTION 1: Chariow Stores & API Keys Management */}
      <Card className="p-6 sm:p-7 space-y-5 bg-white border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-800" />
              <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                Boutiques Chariow & Clés API ({stores.length}/{maxStores})
              </h2>
            </div>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              Plan {plan.toUpperCase()} : {maxStores} boutique(s) autorisée(s).
            </p>
          </div>

          <Button
            variant="chariow"
            size="sm"
            type="button"
            onClick={handleStartAddStore}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Ajouter une autre boutique
          </Button>
        </div>

        {/* Upgrade Proposal Card if limit is reached */}
        {showUpgradeNotice && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <div className="font-black text-sm">
                  Limite de boutiques atteinte pour votre plan {plan.toUpperCase()}
                </div>
                <p className="font-semibold text-slate-900">
                  {plan === 'free'
                    ? 'Le Plan Gratuit est limité à 1 seule boutique Chariow. Pour connecter 2 boutiques et publier jusqu’à 20 produits, passez au Plan Créateur ($2.50/mois). Pour des boutiques illimitées, passez au Plan Pro ($9/mois).'
                    : 'Le Plan Créateur permet de gérer 2 boutiques. Pour des boutiques illimitées et des statistiques prioritaires, passez au Plan Pro ($9/mois).'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Link to="/dashboard/subscription">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Découvrir les Abonnements
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setShowUpgradeNotice(false)}
                className="text-xs font-bold text-slate-800 hover:text-black underline"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Form to add a new store and API key */}
        {isAddingStore && (
          <form onSubmit={handleSaveNewStore} className="p-4 bg-slate-50 rounded-2xl border border-slate-300 space-y-4">
            <div className="font-black text-xs uppercase tracking-wider text-slate-950">
              Connecter une nouvelle boutique Chariow
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900">Nom de la boutique</label>
                <input
                  type="text"
                  required
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="Ex: Deuxième Boutique Mode"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-950 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900">URL Chariow</label>
                <input
                  type="url"
                  required
                  value={newStoreUrl}
                  onChange={(e) => setNewStoreUrl(e.target.value)}
                  placeholder="https://chariow.com/store/..."
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-950 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900">Clé API Chariow</label>
              <input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="sk_live_..."
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 text-slate-950 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button variant="primary" size="sm" type="submit">
                Enregistrer la boutique
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsAddingStore(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}

        {/* Existing Stores List */}
        <div className="space-y-3">
          {stores.length === 0 ? (
            <div className="p-6 text-center text-xs font-bold text-slate-700 bg-slate-50 rounded-xl border border-slate-200">
              Aucune boutique Chariow configurée. Cliquez sur le bouton pour connecter votre première boutique.
            </div>
          ) : (
            stores.map((s) => {
              const rawKey = (s as any).api_key || '';
              const maskedKey = rawKey
                ? `${rawKey.slice(0, 7)}••••••••••••••••${rawKey.slice(-4)}`
                : 'Aucune clé API configurée';

              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-slate-950 truncate">
                        {s.name}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded bg-emerald-100 text-emerald-950">
                        {s.is_connected ? 'API Connectée' : 'Manuel'}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono font-bold text-slate-800">
                      Clé API : <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{maskedKey}</span>
                    </div>

                    {s.external_chariow_url && (
                      <a
                        href={s.external_chariow_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline block truncate"
                      >
                        {s.external_chariow_url}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteStore(s.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Supprimer la boutique"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* SECTION 2: Public Profile Settings */}
      <Card className="p-6 sm:p-7 space-y-5 bg-white border-slate-200 shadow-2xs">
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-900" />
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
              Informations du Profil Public
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-800 mt-0.5">
            Ces informations définissent votre vitrine publique sur ManuX.
          </p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900">Nom public / Marque</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 bg-white outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900">Nom d'utilisateur unique (@)</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 bg-white outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>
          </div>

          {/* Country Selector with Live API and Flags */}
          <CountrySelector
            value={country}
            onChange={(c: CountryData) => {
              setCountry(c.name);
              if (c.currencyCode) {
                setDefaultCurrency(c.currencyCode);
              }
            }}
            label="Pays d'activité (API en direct)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900">Ville</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Kinshasa, Abidjan, Dakar..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 bg-white outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900">
                Devise Principale du Compte <span className="text-emerald-700 font-extrabold">(API en direct - Par défaut pour vos produits)</span>
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 text-slate-950 bg-white outline-none focus:border-emerald-600 shadow-xs cursor-pointer"
              >
                {uniqueCurrencies.length > 0 ? (
                  uniqueCurrencies.map((cur) => (
                    <option key={cur.code} value={cur.code}>
                      {cur.code} - {cur.name} ({cur.symbol}) • {cur.flags.join(' ')} {cur.sampleCountry}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="CDF">CDF - Franc Congolais (RDC) • 🇨🇩</option>
                    <option value="XOF">XOF - Franc CFA UEMOA • 🇨🇮 🇸🇳</option>
                    <option value="XAF">XAF - Franc CFA CEMAC • 🇨🇲 🇬🇦</option>
                    <option value="USD">USD - US Dollar ($) • 🇺🇸</option>
                    <option value="EUR">EUR - Euro (€) • 🇪🇺</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-900">Biographie</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Décrivez votre activité et vos produits..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 bg-white outline-none focus:border-emerald-600 shadow-xs"
            />
          </div>

          <div className="pt-2">
            <Button variant="primary" size="md" type="submit" isLoading={profileSaving}>
              Mettre à jour mon profil
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 3: Password & Security */}
      <Card className="p-6 sm:p-7 space-y-4 bg-white border-slate-200 shadow-2xs">
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-900" />
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
              Sécurité & Mot de Passe
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-800 mt-0.5">
            Compte associé : <strong className="text-slate-950">{user?.email}</strong>
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-md">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-900">Nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 bg-white outline-none focus:border-emerald-600 shadow-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-900">Confirmer le mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 bg-white outline-none focus:border-emerald-600 shadow-xs"
            />
          </div>

          <div className="pt-2">
            <Button variant="outline" size="sm" type="submit" isLoading={savingPassword}>
              Changer mon mot de passe
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
