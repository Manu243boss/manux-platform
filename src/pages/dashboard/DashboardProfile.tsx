import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Phone,
  MessageSquare,
  Globe,
  Camera,
  Image as ImageIcon,
  Trash2,
  Mail,
  Send,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SeoHead } from '../../components/ui/SeoHead';
import { convertImageToWebP } from '../../lib/imageOptimization';
import { useCurrency } from '../../context/CurrencyContext';
import { CurrencyCountryModal } from '../../components/ui/CurrencyCountryModal';
import { CountryData, DEFAULT_COUNTRIES } from '../../services/countries';
import { SupportedCurrency } from '../../types';

export const DashboardProfile: React.FC = () => {
  const { user, profile, refreshProfile, isEmailVerified, resendVerificationEmail } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [profileType, setProfileType] = useState('Créateur');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState(currency || 'XOF');
  const [language, setLanguage] = useState('Français');
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  // Match current country object for flag and currency display
  const currentCountryData = React.useMemo(() => {
    if (!country) return DEFAULT_COUNTRIES[0];
    const match = DEFAULT_COUNTRIES.find(
      (c) =>
        c.name.toLowerCase() === country.toLowerCase() ||
        c.code.toLowerCase() === country.toLowerCase() ||
        c.officialName.toLowerCase() === country.toLowerCase()
    );
    return match || {
      code: 'CI',
      name: country,
      officialName: country,
      dialCode: '+225',
      currencyCode: preferredCurrency || 'XOF',
      currencyName: 'Franc CFA',
      currencySymbol: 'CFA',
      flagEmoji: '🌍',
      region: 'Afrique',
    };
  }, [country, preferredCurrency]);

  const handleSelectCountryFromModal = (selectedCountry: CountryData) => {
    setCountry(selectedCountry.name);
    setPreferredCurrency(selectedCountry.currencyCode);
    setCurrency(selectedCountry.currencyCode as SupportedCurrency);

    // If whatsapp/phone is empty, optionally prefill with country dial code
    if (!whatsappNumber) {
      setWhatsappNumber(`${selectedCountry.dialCode} `);
    }
    if (!phoneNumber) {
      setPhoneNumber(`${selectedCountry.dialCode} `);
    }
  };

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [resendingEmail, setResendingEmail] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const handleResendEmail = async () => {
    if (resendingEmail) return;
    setResendingEmail(true);
    setVerificationFeedback(null);
    try {
      const res = await resendVerificationEmail();
      setVerificationFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch {
      setVerificationFeedback({
        type: 'error',
        message: 'Impossible de renvoyer l\'email pour le moment.',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setCountry(profile.country || 'Côte d’Ivoire');
      setCity(profile.city || '');
      setBio(profile.bio || '');
      setProfileType(profile.profile_type || 'Créateur');
      setWebsiteUrl(profile.website_url || '');
      setAvatarUrl(profile.avatar_url || '');
      setBannerUrl(profile.banner_url || '');
      setPhoneNumber((profile as any).phone_number || '');
      setWhatsappNumber((profile as any).whatsapp_number || '');
      setPreferredCurrency((profile as any).preferred_currency || currency || 'XOF');
      setLanguage(profile.language || 'Français');
    }
  }, [profile, currency]);

  // Handle avatar image selection and automatic WebP conversion
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setStatusMsg(null);

      const webpBlob = await convertImageToWebP(file, { maxWidth: 400, quality: 0.85 });
      const fileName = `${user?.id || 'anon'}_avatar_${Date.now()}.webp`;
      let finalAvatarUrl = '';

      try {
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, webpBlob, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!uploadErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          finalAvatarUrl = data.publicUrl;
        }
      } catch (storageErr) {
        console.warn('[ManuX Avatar] Storage bucket upload fallback to Data URL:', storageErr);
      }

      if (!finalAvatarUrl) {
        finalAvatarUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(webpBlob);
        });
      }

      setAvatarUrl(finalAvatarUrl);
      setStatusMsg({
        type: 'success',
        text: 'Photo de profil convertie en WebP optimisé ! Cliquez sur "Enregistrer" pour valider.',
      });
    } catch (err: any) {
      console.error('[ManuX Avatar Error]:', err);
      setStatusMsg({
        type: 'error',
        text: 'Impossible de convertir l’image. Veuillez réessayer avec un format valide.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle banner cover image selection and automatic WebP conversion
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingBanner(true);
      setStatusMsg(null);

      // Convert and compress to WebP (standard width 1600px for banners)
      const webpBlob = await convertImageToWebP(file, { maxWidth: 1600, maxHeight: 600, quality: 0.85 });
      const fileName = `${user?.id || 'anon'}_banner_${Date.now()}.webp`;
      let finalBannerUrl = '';

      try {
        const { error: uploadErr } = await supabase.storage
          .from('banners')
          .upload(fileName, webpBlob, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!uploadErr) {
          const { data } = supabase.storage.from('banners').getPublicUrl(fileName);
          finalBannerUrl = data.publicUrl;
        }
      } catch (storageErr) {
        console.warn('[ManuX Banner] Storage bucket upload fallback to Data URL:', storageErr);
      }

      if (!finalBannerUrl) {
        finalBannerUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(webpBlob);
        });
      }

      setBannerUrl(finalBannerUrl);
      setStatusMsg({
        type: 'success',
        text: 'Photo de couverture (Cover) convertie en WebP ! Cliquez sur "Enregistrer" pour valider.',
      });
    } catch (err: any) {
      console.error('[ManuX Banner Error]:', err);
      setStatusMsg({
        type: 'error',
        text: 'Impossible de convertir la photo de couverture. Veuillez réessayer.',
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setStatusMsg(null);

      // Clean and validate username
      const cleanUsername = username
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]/g, '');

      if (!cleanUsername) {
        setStatusMsg({ type: 'error', text: 'L’identifiant unique (username) est obligatoire.' });
        setSaving(false);
        return;
      }

      const updates: any = {
        id: user.id,
        display_name: displayName.trim(),
        username: cleanUsername,
        country,
        city,
        bio,
        profile_type: profileType,
        website_url: websiteUrl,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        phone_number: phoneNumber,
        whatsapp_number: whatsappNumber,
        preferred_currency: preferredCurrency,
        language,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        console.error('[ManuX Profile Update Error]:', error);
        setStatusMsg({ type: 'error', text: `Erreur: ${error.message}` });
        return;
      }

      // Update currency globally if changed
      if (preferredCurrency && preferredCurrency !== currency) {
        setCurrency(preferredCurrency);
      }

      await refreshProfile();

      setStatusMsg({
        type: 'success',
        text: 'Votre profil et votre vitrine ont été mis à jour avec succès !',
      });
    } catch (err: any) {
      console.error('[ManuX Profile Save Error]:', err);
      setStatusMsg({ type: 'error', text: 'Une erreur imprévue est survenue lors de l’enregistrement.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SeoHead
        title="Mon Profil & Vitrine • Dashboard ManuX"
        description="Gérez votre profil public, votre photo de couverture (Cover) et présentez votre vitrine de créateur Chariow."
      />

      {/* Header with quick link to public profile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 font-serif-heading">
            Mon Profil & Vitrine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Personnalisez votre identité, votre photo de profil, votre bannière de vitrine et vos canaux de contact.
          </p>
        </div>

        {username && (
          <a
            href={`/creators/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-2xs transition-colors shrink-0"
          >
            <span>Voir ma vitrine publique</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
          </a>
        )}
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Account Email & Verification Status Card */}
      <Card className="p-4 sm:p-5 border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl shrink-0 ${isEmailVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">Adresse e-mail du compte</span>
                {isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Email vérifié
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    En attente de vérification
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-mono mt-0.5 truncate">
                {user?.email || 'Non renseigné'}
              </p>
              {!isEmailVerified && (
                <p className="text-[11px] text-amber-900/80 mt-1">
                  Confirmez votre e-mail pour sécuriser l'accès à votre vitrine et rassurer vos visiteurs.
                </p>
              )}
            </div>
          </div>

          {!isEmailVerified && (
            <div className="shrink-0 pt-2 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendEmail}
                isLoading={resendingEmail}
                leftIcon={<Send className="w-3.5 h-3.5 text-amber-600" />}
                className="w-full sm:w-auto border-amber-300 hover:bg-amber-50 text-amber-950 text-xs font-bold"
              >
                Renvoyer le lien de confirmation
              </Button>
            </div>
          )}
        </div>

        {verificationFeedback && (
          <div
            className={`mt-3 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              verificationFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {verificationFeedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            )}
            <span>{verificationFeedback.message}</span>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-7 border-slate-200">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Cover Photo / Banner Section */}
          <div className="space-y-2 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  <span>Photo de couverture / Bannière de vitrine (Cover)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  L'image d'en-tête affichée en haut de votre page vitrine publique. Convertie automatiquement en <strong>WebP</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => bannerInputRef.current?.click()}
                  isLoading={uploadingBanner}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  {bannerUrl ? 'Changer la cover' : 'Ajouter une cover'}
                </Button>
                {bannerUrl && (
                  <button
                    type="button"
                    onClick={() => setBannerUrl('')}
                    title="Supprimer la cover"
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleBannerFileChange}
                className="hidden"
              />
            </div>

            {/* Cover Preview Container */}
            <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-2xs group">
              {bannerUrl ? (
                <img
                  src={bannerUrl}
                  alt="Cover de la vitrine"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <ImageIcon className="w-8 h-8 text-amber-400/50 mb-1" />
                  <span className="text-xs font-semibold text-slate-300">Aucune photo de couverture personnalisée</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Format recommandé : 1600x600 px (JPEG, PNG, WebP)</span>
                </div>
              )}

              {/* Edit overlay on hover */}
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Modifier la photo de couverture</span>
              </button>
            </div>
          </div>

          {/* Avatar WebP Upload Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-slate-100">
            <div className="relative group shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-amber-400 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-950 text-amber-400 font-black text-2xl flex items-center justify-center border-4 border-amber-400 shadow-sm">
                  {displayName?.slice(0, 1).toUpperCase() || 'M'}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 text-amber-400 hover:bg-amber-500 hover:text-slate-950 shadow-md transition-colors cursor-pointer"
                title="Changer la photo (convertie en WebP)"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-xs font-bold text-slate-900">
                Photo de profil / Logo de vitrine
              </h4>
              <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
                Téléversez une photo JPEG, PNG ou GIF. Elle sera automatiquement optimisée et compressée au format <strong>WebP</strong> haute vitesse.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={uploadingAvatar}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Téléverser une image
                </Button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-xs text-rose-600 hover:underline px-2 cursor-pointer"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Identity Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nom public / Marque *</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none focus:border-amber-400 shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Identifiant unique (URL) *</label>
              <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden px-3 py-2 bg-slate-50 shadow-2xs">
                <span className="text-xs text-slate-400 mr-1">manux.xttools.site/creators/</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-transparent font-bold text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location Fields with Country & Currency Modal trigger */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pays d'activité *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCountryModalOpen(true)}
                  className="text-[11px] font-bold text-amber-900 hover:text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Changer</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCountryModalOpen(true)}
                className="w-full px-3 py-2 text-left rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30 transition-all flex items-center justify-between shadow-2xs group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-xl leading-none shrink-0">{currentCountryData.flagEmoji}</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {country || currentCountryData.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                    {preferredCurrency || currentCountryData.currencyCode}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {currentCountryData.dialCode}
                  </span>
                </div>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Ville de résidence</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Abidjan, Dakar, Kinshasa, Douala..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none focus:border-amber-400 shadow-2xs"
              />
            </div>
          </div>

          {/* Contacts & Direct Communication */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Numéro WhatsApp officiel</span>
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+225 07..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none focus:border-amber-400 shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Téléphone de contact</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+225..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none focus:border-amber-400 shadow-2xs"
              />
            </div>
          </div>

          {/* Currency Preference & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>Devise d'affichage préférée</span>
              </label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white outline-none focus:border-amber-400 shadow-2xs"
              >
                <option value="XOF">XOF - Franc CFA (BCEAO)</option>
                <option value="XAF">XAF - Franc CFA (BEAC)</option>
                <option value="CDF">CDF - Franc Congolais</option>
                <option value="USD">USD - Dollar Américain ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="NGN">NGN - Naira Nigérian (₦)</option>
                <option value="KES">KES - Shilling Kenyan</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Langue</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white outline-none focus:border-amber-400 shadow-2xs"
              >
                <option value="Français">Français</option>
                <option value="English">English</option>
              </select>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Biographie de la vitrine</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Présentez votre parcours, vos formations ou vos produits Chariow..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none focus:border-amber-400 shadow-2xs resize-none"
            />
          </div>

          {/* Website / Portfolio */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Site internet / Portfolio (optionnel)</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://votre-site.com"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none focus:border-amber-400 shadow-2xs"
            />
          </div>

          <div className="pt-2">
            <Button
              variant="chariow"
              size="md"
              type="submit"
              isLoading={saving}
              className="px-6 py-2.5 font-black text-xs shadow-2xs"
            >
              Enregistrer mon profil
            </Button>
          </div>
        </form>
      </Card>

      {/* Country & Currency Selection Modal */}
      <CurrencyCountryModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        onSelectCountry={handleSelectCountryFromModal}
        title="Choisir votre pays d'activité"
        subtitle="Sélectionnez votre pays et votre devise pour votre vitrine et vos coordonnées"
        selectedCountryCode={country}
      />
    </div>
  );
};
