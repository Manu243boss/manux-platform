import React, { useEffect, useState } from 'react';
import { Check, Sparkles, HelpCircle, ArrowRight, Tag, Loader2, ShieldCheck, Zap, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plan } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SeoHead } from '../components/ui/SeoHead';
import { useAuth } from '../context/AuthContext';
import { initiateChariowCheckout } from '../services/paymentService';

export const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        const { data } = await supabase.from('plans').select('*').order('price_usd', { ascending: true });
        if (data && data.length > 0) {
          setPlans(data);
        } else {
          // Fallback static config
          setPlans([
            {
              id: 'free',
              name: 'Plan Gratuit',
              price_usd: 0,
              billing_cycle: 'monthly',
              max_products: 3,
              max_stores: 1,
              can_have_video_demos: false,
              can_have_verified_badge: false,
              has_advanced_analytics: false,
              has_priority_discovery: false,
              features: [
                'Création de profil public',
                '1 boutique Chariow connectée',
                'Jusqu’à 3 produits en vitrine',
                'Présence dans la recherche globale',
                'Statistiques de base (vues & clics)',
                'Partage direct de lien de profil',
              ],
            },
            {
              id: 'creator',
              name: 'Plan Créateur',
              price_usd: 2.5,
              billing_cycle: 'monthly',
              max_products: 20,
              max_stores: 2,
              can_have_video_demos: true,
              can_have_verified_badge: false,
              has_advanced_analytics: true,
              has_priority_discovery: true,
              features: [
                'Jusqu’à 20 produits en vitrine',
                'Jusqu’à 2 boutiques Chariow',
                'Démonstrations vidéo YouTube incluses',
                'Statistiques avancées des clics Chariow',
                'Mise en avant dans les recommandations',
                'Badge Créateur et liens sociaux multiples',
              ],
            },
            {
              id: 'pro',
              name: 'Plan Pro',
              price_usd: 9.0,
              billing_cycle: 'monthly',
              max_products: 100,
              max_stores: 10,
              can_have_video_demos: true,
              can_have_verified_badge: true,
              has_advanced_analytics: true,
              has_priority_discovery: true,
              features: [
                'Produits illimités (jusqu’à 100)',
                'Boutiques multiples (jusqu’à 10)',
                'Vidéos de démonstration prioritaires',
                'Badge de vitrine Vérifié / Pro',
                'Changement libre de miniatures vidéo',
                'Support créateur dédié 7j/7',
              ],
            },
          ]);
        }
      } catch (err) {
        console.error('[ManuX Pricing] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

  const handleSelectPlan = async (planId: string) => {
    setErrorMessage(null);

    if (planId === 'free') {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/auth/register');
      }
      return;
    }

    if (!user) {
      navigate(`/auth/register?plan=${planId}`);
      return;
    }

    if (planId !== 'creator' && planId !== 'pro') return;

    try {
      setProcessingPlan(planId);
      const result = await initiateChariowCheckout(planId);

      if (result.success && result.checkout_url) {
        setPendingCheckoutUrl(result.checkout_url);
        // Open checkout in new window/tab to avoid iframe connection restrictions
        window.open(result.checkout_url, '_blank', 'noopener,noreferrer');
        setProcessingPlan(null);
      } else {
        setErrorMessage(result.message || 'Impossible d’initialiser le paiement Chariow.');
        setProcessingPlan(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur inattendue.');
      setProcessingPlan(null);
    }
  };

  const currentPlan = profile?.subscription_plan || 'free';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <SeoHead
        title="Tarifs & Forfaits Créateurs Chariow | ManuX"
        description="Découvrez nos forfaits transparents pour présenter vos produits Chariow en vidéo : Gratuit, Créateur ($2.50/mois) et Pro ($9/mois) traités en toute sécurité par Chariow."
        canonical="https://manux.xttools.site/pricing"
      />

      {/* Pending Checkout Alert / Launch Banner */}
      {pendingCheckoutUrl && (
        <div className="max-w-3xl mx-auto bg-emerald-900 text-white rounded-2xl p-5 shadow-xl border border-emerald-700 space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold text-lg">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Session de Paiement Chariow Prête !</h3>
                <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                  Votre session de paiement sécurisée a été générée avec vos coordonnées pré-remplies.
                  Si la page de paiement ne s’est pas ouverte automatiquement dans un nouvel onglet, cliquez sur le bouton ci-dessous.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPendingCheckoutUrl(null)}
              className="text-emerald-300 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={pendingCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all"
            >
              <span>Accéder à la Caisse Chariow (Paiement Sécurisé)</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <span className="text-[11px] text-emerald-300">S'ouvre dans une fenêtre externe sécurisée</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-950 text-xs font-bold border border-amber-300 shadow-2xs">
          <Tag className="w-3.5 h-3.5 text-amber-700" />
          <span>Paiement sécurisé Chariow • Activation instantanée</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-950 font-serif-heading">
          Tarifs Simples & Flexibles
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Choisissez la formule adaptée pour propulser votre vitrine ManuX et vendre vos produits Chariow 24h/24.
        </p>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Plans comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isCreator = plan.id === 'creator';
          const isPro = plan.id === 'pro';
          const isCurrent = user && currentPlan === plan.id;
          const isProcessing = processingPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col justify-between relative transition-all border ${
                isCreator
                  ? 'border-2 border-amber-400 shadow-md ring-4 ring-amber-50'
                  : isCurrent
                  ? 'border-2 border-emerald-600'
                  : 'border-slate-200'
              }`}
            >
              {isCreator && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                  Populaire
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                  {isCurrent ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Plan Actuel
                    </span>
                  ) : isPro ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950 bg-amber-100 px-2 py-0.5 rounded-full">
                      Pro
                    </span>
                  ) : null}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl lg:text-4xl font-black text-slate-950">
                      ${plan.price_usd}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ mois</span>
                  </div>
                  {plan.price_usd > 0 && (
                    <div className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Licence officielle Chariow
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  {plan.features?.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                      <div className="p-0.5 rounded-full bg-amber-100 text-amber-900 shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <button
                  type="button"
                  disabled={isProcessing || (isCurrent && plan.id === 'free')}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full text-center py-2.5 px-4 rounded-xl text-xs font-black shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : isCreator
                      ? 'bg-amber-400 hover:bg-amber-500 text-slate-950'
                      : isPro
                      ? 'bg-slate-950 hover:bg-slate-800 text-amber-400'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connexion à Chariow...</span>
                    </>
                  ) : isCurrent ? (
                    'Votre formule actuelle'
                  ) : plan.price_usd === 0 ? (
                    'Commencer gratuitement'
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Souscrire via Chariow</span>
                    </>
                  )}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Guarantee & FAQ note */}
      <Card className="p-5 bg-slate-50 border-slate-200 text-center max-w-2xl mx-auto text-xs text-slate-600 space-y-1">
        <p className="font-bold text-slate-900 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Paiements & Licences sécurisés par Chariow
        </p>
        <p className="text-slate-500">
          Votre abonnement ManuX est directement lié à votre licence Chariow. Vous bénéficiez d’un cycle mensuel de 30 jours avec activation instantanée par webhook.
        </p>
      </Card>
    </div>
  );
};

