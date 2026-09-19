import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  Key,
  Copy,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Zap,
  AlertTriangle,
  X,
  CreditCard,
  Receipt,
  Calendar,
  ArrowRight,
  Award,
  Check,
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Subscription } from '../../types';
import { SeoHead } from '../../components/ui/SeoHead';
import {
  initiateChariowCheckout,
  calculateSubscriptionCountdown,
  SubscriptionCountdown,
} from '../../services/paymentService';

export const DashboardSubscription: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mode Développeur : Simulateur de Webhook Chariow Pulse
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatedPlan, setSimulatedPlan] = useState<'creator' | 'pro'>('creator');
  const [simulating, setSimulating] = useState(false);
  const [simulatedResult, setSimulatedResult] = useState<any | null>(null);
  const [simulatedSaleId, setSimulatedSaleId] = useState(`sim_${Math.random().toString(36).substring(2, 11)}`);
  const [simulatedLicense, setSimulatedLicense] = useState(`MX-TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

  const handleSimulateWebhook = async () => {
    if (!user) return;
    try {
      setSimulating(true);
      setSimulatedResult(null);

      const productId = simulatedPlan === 'creator' ? 'prd_bqe0zdzi' : 'prd_lsy7udh2';
      const amount = simulatedPlan === 'creator' ? 2.5 : 9.0;

      const payload = {
        event: 'sale.completed',
        sale_id: simulatedSaleId,
        product_id: productId,
        amount: amount,
        currency: 'USD',
        customer: {
          email: user.email || 'test@manux.site',
          name: profile?.full_name || 'Utilisateur Test'
        },
        license_key: simulatedLicense,
        custom_metadata: {
          manux_user_id: user.id
        }
      };

      const response = await fetch('/api/webhooks/chariow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-chariow-signature': 'simulated_dev_signature'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setSimulatedResult(data);

      if (response.ok && data.activated) {
        setSimulatedSaleId(`sim_${Math.random().toString(36).substring(2, 11)}`);
        setSimulatedLicense(`MX-TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
        await refreshProfile();
        
        // Refresh local UI states
        const [subRes, txRes] = await Promise.all([
          supabase.from('subscriptions').select('*, plan:plans(*)').eq('user_id', user.id).maybeSingle(),
          supabase.from('payment_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        ]);

        if (subRes.data) setCurrentSub(subRes.data);
        if (txRes.data) setTransactions(txRes.data);
      }
    } catch (err: any) {
      console.error('[Simulator Error]:', err);
      setSimulatedResult({ error: 'SIMULATOR_FAILED', message: err?.message || 'Impossible de joindre le webhook.' });
    } finally {
      setSimulating(false);
    }
  };

  const verifyingStatus = searchParams.get('status') === 'verifying';
  const verifyingPlan = searchParams.get('plan');

  useEffect(() => {
    async function loadSubData() {
      if (!user) return;
      try {
        setLoading(true);
        const [subRes, txRes] = await Promise.all([
          supabase.from('subscriptions').select('*, plan:plans(*)').eq('user_id', user.id).maybeSingle(),
          supabase.from('payment_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        ]);

        if (subRes.data) setCurrentSub(subRes.data);
        if (txRes.data) setTransactions(txRes.data);
      } catch (err) {
        console.error('[ManuX Subscription] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSubData();
  }, [user]);

  const countdown: SubscriptionCountdown = calculateSubscriptionCountdown(profile);
  const currentPlanId = profile?.subscription_plan || currentSub?.plan_id || 'free';

  const handleCopyKey = () => {
    if (!profile?.license_key) return;
    navigator.clipboard.writeText(profile.license_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleUpgrade = async (planId: 'creator' | 'pro') => {
    try {
      setErrorMessage(null);
      setProcessingPlan(planId);
      const result = await initiateChariowCheckout(planId);

      if (result.success && result.checkout_url) {
        setPendingCheckoutUrl(result.checkout_url);
        window.open(result.checkout_url, '_blank', 'noopener,noreferrer');
        setProcessingPlan(null);
      } else {
        setErrorMessage(result.message || 'Impossible de démarrer le paiement Chariow.');
        setProcessingPlan(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur inattendue.');
      setProcessingPlan(null);
    }
  };

  const startDateFormatted = profile?.subscription_started_at
    ? new Date(profile.subscription_started_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Aujourd’hui';

  const expiresDateFormatted = countdown.formattedExpirationDate || (
    profile?.subscription_expires_at
      ? new Date(profile.subscription_expires_at).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Accès Permanent (Standard)'
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <SeoHead title="Mon Abonnement - Dashboard ManuX" />

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-serif-heading">
              Mon Abonnement & Licences
            </h1>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Gérez votre forfait créateur ManuX, votre cycle de 30 jours et consultez vos reçu de paiements Chariow Pulse.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshProfile()}
          className="self-start sm:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Synchroniser le Statut</span>
        </button>
      </div>

      {/* PENDING CHECKOUT BANNER */}
      {pendingCheckoutUrl && (
        <div className="bg-emerald-950 border-2 border-emerald-500/80 text-white rounded-3xl p-6 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 font-black text-lg">
                ✓
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-white">
                  Session de Paiement Chariow Prête !
                </h3>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  Votre session de paiement sécurisée a été générée avec vos coordonnées. Si la page ne s'est pas ouverte automatiquement, cliquez sur le bouton ci-dessous pour finaliser votre commande.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPendingCheckoutUrl(null)}
              className="text-emerald-300 hover:text-white p-1 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={pendingCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all"
            >
              <span>Accéder à la Caisse Chariow</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <span className="text-[11px] text-emerald-300">Transaction sécurisée SSL 256-bit par Chariow</span>
          </div>
        </div>
      )}

      {/* VERIFYING STATUS BANNER */}
      {verifyingStatus && (
        <div className="p-5 bg-amber-50 border-2 border-amber-300 text-amber-950 rounded-3xl space-y-1">
          <div className="flex items-center gap-2 font-black text-sm">
            <Sparkles className="w-5 h-5 text-amber-600 animate-bounce" />
            <span>Paiement Chariow Pulse en cours de confirmation...</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed pl-7">
            Votre souscription pour le plan <strong>{verifyingPlan?.toUpperCase()}</strong> est enregistrée. Dès réception de la confirmation finale, votre compte s'actualisera automatiquement.
          </p>
        </div>
      )}

      {/* EXPIRATION ALERTS */}
      {countdown.isExpiringSoon && !countdown.isExpired && (
        <div className="p-5 bg-orange-50 border border-orange-300 text-orange-950 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-extrabold text-slate-900">
                Abonnement expirant bientôt ({countdown.daysRemaining} jour(s) restant(s))
              </p>
              <p className="text-orange-900">
                A l'échéance des 30 jours, votre compte basculera en Plan Gratuit. Renouvelez votre offre pour conserver vos avantages.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleUpgrade(currentPlanId === 'pro' ? 'pro' : 'creator')}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-extrabold rounded-xl shrink-0"
          >
            Renouveler Mon Plan
          </button>
        </div>
      )}

      {countdown.isExpired && (
        <div className="p-5 bg-rose-50 border border-rose-300 text-rose-950 rounded-3xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-extrabold text-slate-900">Votre formule créateur a expiré</p>
            <p className="text-rose-900">
              Votre compte est désormais au Plan Gratuit. Passez au Plan Créateur ($2.50) ou Pro ($9.00) pour débloquer l'intégralité des fonctionnalités.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-bold">
          {errorMessage}
        </div>
      )}

      {/* MAIN SUBSCRIPTION CARD (CLEAN & HIGH CONTRAST) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-8 relative overflow-hidden">
        {/* Background glow ornament */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* TOP STATUS BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Abonnement Actuel
              </span>
              <span
                className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-full border ${
                  currentPlanId === 'pro'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : currentPlanId === 'creator'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {currentPlanId === 'pro'
                  ? 'Plan Pro'
                  : currentPlanId === 'creator'
                  ? 'Plan Créateur'
                  : 'Plan Gratuit'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white font-serif-heading">
              {currentPlanId === 'pro'
                ? 'ManuX Pro ($9.00/mois)'
                : currentPlanId === 'creator'
                ? 'ManuX Créateur ($2.50/mois)'
                : 'ManuX Découverte (Gratuit $0.00)'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              {currentPlanId === 'free'
                ? 'Vous profitez de la version gratuite : jusqu’à 3 produits et 1 boutique Chariow connectée.'
                : 'Votre formule Créateur est active avec intégration illimitée, démonstrations vidéo et statistiques.'}
            </p>
          </div>

          {/* COUNTDOWN WIDGET FOR PAID PLANS */}
          {currentPlanId !== 'free' && (
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 flex flex-col items-center justify-center min-w-[220px] text-center shadow-inner shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold mb-1">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Reste du Temps</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
                {countdown.daysRemaining}{' '}
                <span className="text-sm font-bold text-slate-400">jours</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                et {countdown.hoursRemaining}h restante(s)
              </p>
            </div>
          )}
        </div>

        {/* METADATA GRID: DATES & PROVIDER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 relative z-10">
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Date d'Activation</span>
            </div>
            <p className="text-sm font-extrabold text-white">{startDateFormatted}</p>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wide">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Sera Terminé Le</span>
            </div>
            <p className="text-sm font-extrabold text-amber-300">{expiresDateFormatted}</p>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 space-y-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wide">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Partenaire de Paiement</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-sm font-extrabold text-white">Chariow Pulse</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Direct
              </span>
            </div>
          </div>
        </div>

        {/* LICENSE KEY SECTION */}
        {profile?.license_key && (
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <Key className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">
                  Clé de Licence Chariow
                </p>
                <code className="text-xs sm:text-sm text-emerald-300 font-mono font-black">
                  {profile.license_key}
                </code>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyKey}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
            >
              {copiedKey ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Clé Copiée !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Copier la Licence</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* UPGRADE PROMOTION FOR FREE USERS */}
        {currentPlanId === 'free' && (
          <div className="pt-6 border-t border-slate-800/80 bg-slate-800/50 p-5 rounded-2xl border border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start text-amber-400 font-black text-sm">
                <Zap className="w-4 h-4" />
                <span>Débloquez l'Intégralité des Fonctionnalités Créateur</span>
              </div>
              <p className="text-xs text-slate-300">
                Passez au Plan Créateur ($2.50) ou Pro ($9.00) pour importer jusqu'à 100 produits, ajouter vos vidéos YouTube et booster vos ventes.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleUpgrade('creator')}
                disabled={processingPlan === 'creator'}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                {processingPlan === 'creator' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Passer à Créateur ($2.50)</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpgrade('pro')}
                disabled={processingPlan === 'pro'}
                className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                {processingPlan === 'pro' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Passer à Pro ($9.00)</span>
              </button>

              <Link
                to="/pricing"
                className="px-3 py-2.5 text-xs font-extrabold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Tarifs & Plans</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* CHARIOW PULSE AUDIT TRAIL */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-serif-heading">
                Reçus & Informations de Paiements Chariow Pulse
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Historique réel des paiements webhooks traités par Chariow.
              </p>
            </div>
          </div>

          <Link
            to="/pricing"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
          >
            <span>Consulter les tarifs complets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CreditCard className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">Aucune transaction enregistrée pour le moment.</p>
            <p className="max-w-md mx-auto text-slate-500">
              Lorsque vous effectuez un paiement via Chariow, la notification Pulse met à jour votre historique ici en temps réel.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-slate-50/60 px-3 rounded-xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-slate-900 text-sm uppercase tracking-wide">
                      Forfait {tx.plan}
                    </span>
                    <span className="font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300 text-xs">
                      ${tx.amount} {tx.currency || 'USD'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
                    <span>
                      Réf Vente Chariow :{' '}
                      <code className="font-mono text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                        {tx.provider_sale_id}
                      </code>
                    </span>
                    <span>
                      ID Produit : <code className="font-mono text-slate-700">{tx.product_id}</code>
                    </span>
                    <span>
                      {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {tx.customer_email && (
                    <div className="text-[11px] text-slate-500">
                      Email Client : <span className="font-semibold text-slate-800">{tx.customer_email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Payé (Pulse)</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DEVELOPER SIMULATOR ZONE */}
      <div className="bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-bl-xl font-mono">
          Developer Testing Mode
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white font-serif-heading">
              🧪 Simulateur de Paiement & Webhook Chariow Pulse
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Puisque l'environnement n'exécute pas de paiements réels lors des tests, utilisez ce simulateur pour imiter une vente complétée sur Chariow Pulse. Cela déclenchera le webhook de la plateforme, validera la signature fictive et activera l'abonnement dans votre base de données Supabase.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Controls */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold block">1. Choisissez le forfait à simuler</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSimulatedPlan('creator')}
                  className={`px-4 py-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    simulatedPlan === 'creator'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/80 shadow-md'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Plan Créateur ($2.50)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimulatedPlan('pro')}
                  className={`px-4 py-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    simulatedPlan === 'pro'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/80 shadow-md'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Plan Pro ($9.00)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">ID Vente (Simulé)</label>
                <input
                  type="text"
                  value={simulatedSaleId}
                  onChange={(e) => setSimulatedSaleId(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Clé Licence (Simulée)</label>
                <input
                  type="text"
                  value={simulatedLicense}
                  onChange={(e) => setSimulatedLicense(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSimulateWebhook}
              disabled={simulating}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {simulating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement du webhook en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Déclencher le Webhook Chariow Pulse</span>
                </>
              )}
            </button>
          </div>

          {/* Result Logs */}
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 font-mono text-[11px] space-y-3 flex flex-col min-h-[180px] justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span>Console Webhook Response</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-400">POST /api/webhooks/chariow</span>
              </div>
              <div className="overflow-y-auto max-h-[140px] text-slate-300 space-y-1.5 pt-1">
                {simulatedResult ? (
                  <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(simulatedResult, null, 2)}
                  </pre>
                ) : simulating ? (
                  <p className="text-amber-400 animate-pulse">Envoi du payload JSON à l'API de webhook...</p>
                ) : (
                  <p className="text-slate-500 italic">Prêt à recevoir la réponse de simulation. Cliquez sur le bouton pour tester l'activation instantanée.</p>
                )}
              </div>
            </div>

            {simulatedResult?.activated && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold animate-fadeIn">
                ✓ Succès ! Votre compte a été mis à niveau en plan {simulatedResult.plan?.toUpperCase()} avec la licence dans Supabase. Rafraîchissez la page ou visualisez l'historique !
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Toutes les souscriptions sont traitées de façon sécurisée par Chariow. Le compte à rebours de 30 jours s'ajuste automatiquement dès confirmation du paiement. Vous pouvez consulter les détails des forfaits et fonctionnalités sur la page des tarifs.
        </p>
      </div>
    </div>
  );
};
