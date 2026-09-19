import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Video,
  Store,
  BarChart3,
  CreditCard,
  Settings,
  User,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { PromoDiscountCard } from '../ui/PromoDiscountCard';

export const DashboardLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { profile, user, loading } = useAuth();
  const location = useLocation();

  const mainItems = [
    { label: "Vue d'ensemble", path: '/dashboard', icon: LayoutDashboard },
    { label: 'Mes produits', path: '/dashboard/products', icon: Package },
    { label: 'Mes vidéos', path: '/dashboard/videos', icon: Video },
    { label: 'Ma boutique', path: '/dashboard/store', icon: Store },
    { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Mon profil', path: '/dashboard/profile', icon: User },
    { label: 'Abonnement', path: '/dashboard/subscription', icon: CreditCard },
    { label: 'Paramètres', path: '/dashboard/settings', icon: Settings },
  ];

  // Instant local check to eliminate false 5-second draft banner flashes
  const isLocallyCompleted = user?.id
    ? localStorage.getItem(`manux_onboarding_completed_${user.id}`) === 'true'
    : false;

  const isDraft =
    !loading &&
    profile &&
    !isLocallyCompleted &&
    (profile.status === 'draft' || profile.status === 'incomplete' || !profile.onboarding_completed);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-4rem)] pb-16 sm:pb-6">
      {/* Profile Incomplete Notification Banner (Only if genuinely incomplete) */}
      {isDraft && (
        <div className="bg-amber-100/95 border-b border-amber-300 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 font-semibold shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
            <span>
              Votre profil n'est pas encore terminé. Finalisez votre compte pour publier votre vitrine.
            </span>
          </div>
          <Link to="/onboarding">
            <Button variant="chariow" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Finaliser mon profil
            </Button>
          </Link>
        </div>
      )}

      {/* Desktop Horizontal Dashboard Navigation Bar */}
      <div className="hidden sm:block bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none sticky top-16 z-20">
        <div className="flex items-center gap-1 min-w-max py-2">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Dashboard View Body */}
      <div className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* 7-Day Welcome Promo Card for New Free Accounts */}
        <PromoDiscountCard />

        <Outlet />
        {children}
      </div>
    </div>
  );
};
