import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SeoHead } from '../../components/ui/SeoHead';
import { CountrySelector } from '../../components/ui/CountrySelector';
import { CountryData } from '../../services/countries';

const PROFILE_TYPES = [
  'Créateur',
  'Formateur',
  'Entrepreneur',
  'Boutique',
  'Freelance',
  'Éducateur',
  'Entreprise',
];

const CATEGORIES = [
  'Formations & Cours',
  'Logiciels & Outils SaaS',
  'E-books & Guides',
  'Templates & Graphisme',
  'Produits Physiques & Mode',
  'Coaching & Consultance',
  'Artisanat & Créations',
];

export const OnboardingPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

  // Form states initialized from existing profile/draft
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('Côte d’Ivoire');
  const [countryCurrency, setCountryCurrency] = useState('XOF');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [profileType, setProfileType] = useState('Créateur');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [websiteUrl, setWebsiteUrl] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (profile) {
      if (profile.display_name) setDisplayName(profile.display_name);
      if (profile.username) setUsername(profile.username);
      if (profile.country) setCountry(profile.country);
      if (profile.city) setCity(profile.city);
      if (profile.bio) setBio(profile.bio);
      if (profile.profile_type) setProfileType(profile.profile_type);
      if (profile.primary_category) setCategory(profile.primary_category);
      if (profile.website_url) setWebsiteUrl(profile.website_url);
    }
  }, [user, profile]);

  const handleCountryChange = (c: CountryData) => {
    setCountry(c.name);
    setCountryCurrency(c.currencyCode);
  };

  // Finalize Onboarding & Publish Profile
  const finalizeOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading) return;
    setLoading(true);
    setSavingMsg('Publication de votre profil en cours...');

    try {
      const cleanUname = (username || displayName || `user${user.id.slice(0, 6)}`)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '');

      const profileData = {
        id: user.id,
        display_name: displayName.trim() || 'Créateur ManuX',
        username: cleanUname,
        country,
        city: city.trim(),
        bio: bio.trim(),
        profile_type: profileType,
        primary_category: category,
        website_url: websiteUrl.trim() || null,
        status: 'published',
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      // Try update first or upsert
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) throw error;

      localStorage.setItem(`manux_onboarding_completed_${user.id}`, 'true');
      await refreshProfile();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('[ManuX Onboarding] Error:', err);
      setSavingMsg(err.message || 'Erreur lors de la finalisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <SeoHead title="Finalisation du profil créateur ManuX" />

      {/* Top Banner Notice */}
      <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-sm shrink-0">
            {step}/2
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-950">
              Configuration de votre profil créateur ManuX
            </h3>
            <p className="text-xs font-semibold text-slate-800">
              Remplissez ces informations essentielles pour activer votre vitrine publique.
            </p>
          </div>
        </div>

        {savingMsg && (
          <span className="text-xs text-emerald-800 font-bold animate-pulse shrink-0">
            {savingMsg}
          </span>
        )}
      </div>

      {/* STEP 1: Personal & Country Info */}
      {step === 1 && (
        <Card className="p-6 sm:p-8 space-y-6 bg-white border-slate-200">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950">
              Étape 1 : Identité & Localisation
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
              Renseignez votre nom public et sélectionnez votre pays d'activité.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900">
                  Nom public / Marque <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Amara Traoré"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900">
                  Identifiant URL unique <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 overflow-hidden px-3 py-2.5 bg-slate-50 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-600 mr-0.5 shrink-0">
                    manux.../
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="amara"
                    className="w-full text-sm bg-transparent font-bold text-slate-950 outline-none"
                  />
                </div>
              </div>
            </div>

            <CountrySelector
              value={country}
              onChange={handleCountryChange}
              label="Pays d'activité"
            />

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900">Ville de résidence</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Abidjan, Dakar, Kinshasa, Douala..."
                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900">
                Biographie de présentation
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Présentez brièvement vos compétences, vos services et votre univers..."
                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={() => setStep(2)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continuer vers l'étape 2
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Profile Type & Category & Finalize */}
      {step === 2 && (
        <form onSubmit={finalizeOnboarding} className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6 bg-white border-slate-200">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                Étape 2 : Type de profil & Thématique
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
                Choisissez votre catégorie pour guider les acheteurs et publier votre profil.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900">
                  Quel type d'acteur êtes-vous ?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PROFILE_TYPES.map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setProfileType(pt)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                        profileType === pt
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900">
                  Catégorie principale de vos offres
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                        category === cat
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs'
                          : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat}</span>
                      {category === cat && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900">
                  Site Web officiel / Portfolio (Optionnel)
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://monsite.com"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Précédent
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={loading}
                rightIcon={<Sparkles className="w-4 h-4" />}
              >
                Finaliser et Publier mon Profil
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};
