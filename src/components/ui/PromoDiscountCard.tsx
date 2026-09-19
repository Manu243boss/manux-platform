import React, { useState, useEffect } from 'react';
import { X, Sparkles, Zap, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PromoDiscountCard: React.FC = () => {
  const { user, profile } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      setVisible(false);
      return;
    }

    // Check if dismissed previously
    const dismissedKey = `manux_promo_7d_dismissed_${user.id}`;
    if (localStorage.getItem(dismissedKey) === 'true') {
      setVisible(false);
      return;
    }

    // Check if user is on a paid plan (if active creator or pro, do not show)
    const isPaidUser = profile?.subscription_plan === 'creator' || profile?.subscription_plan === 'pro';
    if (isPaidUser) {
      setVisible(false);
      return;
    }

    // Check account age: only show for accounts created within 7 days
    if (user.created_at) {
      const createdAt = new Date(user.created_at).getTime();
      const now = Date.now();
      const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);

      if (diffDays <= 7) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    } else {
      // Default to visible for new sessions if created_at is not available
      setVisible(true);
    }
  }, [user, profile]);

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`manux_promo_7d_dismissed_${user.id}`, 'true');
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 p-3.5 sm:p-4 shadow-sm border border-amber-300 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Background soft highlight decoration */}
      <div className="absolute right-0 top-0 -mt-3 -mr-3 w-28 h-28 bg-white/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <Tag className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950 text-white px-2 py-0.5 rounded-md">
                Offre Spéciale Bienvenue 7 Jours
              </span>
              <span className="text-xs font-black text-slate-950">
                -10% sur tous les abonnements
              </span>
            </div>

            <p className="text-xs font-medium text-slate-900 mt-0.5 leading-snug">
              Activez le <strong>Plan Créateur à 2.25 $/mois</strong> (au lieu de 2.50 $) ou le <strong>Plan Pro à 8.10 $/mois</strong> (au lieu de 9 $).
            </p>
          </div>
        </div>

        {/* Right CTA & Dismiss Button */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <a
            href="/dashboard/subscription?promo=WELCOME10"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-black shadow-xs transition-colors"
          >
            <span>Profiter des -10%</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer la promotion"
            className="p-1.5 rounded-lg text-slate-800 hover:text-slate-950 hover:bg-black/10 transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
