import React, { useState } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  Crown,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { initiateChariowCheckout } from '../../services/paymentService';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  metricTitle?: string;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  featureName = 'Statistiques et Graphiques Avancés',
  metricTitle,
}) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (planId: 'creator' | 'pro') => {
    try {
      setLoadingPlan(planId);
      setError(null);
      const res = await initiateChariowCheckout(planId);
      if (res.success && res.checkout_url) {
        window.open(res.checkout_url, '_blank', 'noopener,noreferrer');
      } else {
        setError(res.message || 'Impossible d’ouvrir la passerelle Chariow.');
      }
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Horizontal Compact Card Container */}
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Slim Gradient Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 w-full" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Horizontal Content Grid */}
        <div className="p-5 sm:p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
          {/* Left Column: Feature Context & Benefits (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300">
                <Crown className="w-3 h-3 text-amber-700" />
                Accès Abonné
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Débloquez les analyses en direct
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-950 font-serif-heading leading-tight">
                {metricTitle ? `Analyse : ${metricTitle}` : featureName}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Visualisez l'entonnoir Chariow complet, l'impact de vos vidéos et vos graphiques en temps réel.
              </p>
            </div>

            {/* Compact Perks List */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Graphiques 7 jours & taux de conversion (CTR)</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Gestion et modération des avis clients</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Boutiques connectées & produits supplémentaires</span>
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: 2 Horizontal Plan Action Cards (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Plan Créateur ($2.50) */}
            <div className="p-4 rounded-2xl border border-amber-200/90 bg-amber-50/40 hover:bg-amber-50/70 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 px-2 py-0.5 rounded bg-amber-200/80">
                    Créateur
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">20 produits</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-950">$2.50</span>
                  <span className="text-xs text-slate-600">/mois</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Idéal pour lancer vos produits et suivre vos clics Chariow.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold border-amber-400 text-amber-950 hover:bg-amber-100 cursor-pointer shadow-2xs"
                disabled={loadingPlan === 'creator'}
                onClick={() => handleCheckout('creator')}
              >
                {loadingPlan === 'creator' ? 'Ouverture...' : 'Choisir Créateur ($2.50)'}
              </Button>
            </div>

            {/* Plan Pro ($9.00) */}
            <div className="p-4 rounded-2xl border-2 border-slate-950 bg-slate-950 text-white flex flex-col justify-between space-y-3 shadow-md relative">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                Recommandé
              </div>
              <div>
                <div className="flex items-center justify-between pr-14">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Pro
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-white">$9.00</span>
                  <span className="text-xs text-slate-300">/mois</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  Accès complet illimité, toutes les statistiques et badge vérifié.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                className="w-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 border-0 cursor-pointer shadow-2xs"
                disabled={loadingPlan === 'pro'}
                onClick={() => handleCheckout('pro')}
              >
                {loadingPlan === 'pro' ? 'Ouverture...' : 'Choisir Pro ($9.00)'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer info strip */}
        <div className="bg-slate-50 px-5 sm:px-6 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
          <a
            href="/dashboard/subscription"
            className="hover:text-slate-950 underline underline-offset-2 flex items-center gap-1 font-bold text-slate-800"
          >
            <span>Comparer tous les détails des forfaits</span>
            <ArrowRight className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
          >
            Fermer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
};
