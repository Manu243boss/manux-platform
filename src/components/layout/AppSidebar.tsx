import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Home,
  Compass,
  Video,
  ShoppingBag,
  Users,
  Grid,
  Sparkles,
  LayoutDashboard,
  Package,
  Film,
  Store,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Info,
  Shield,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

export const AppSidebar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { isCollapsed, isOpen, closeMobileSidebar } = useSidebar();
  const location = useLocation();

  // Collapsible section states
  const [navOpen, setNavOpen] = useState(true);
  const [creatorOpen, setCreatorOpen] = useState(true);
  const [legalOpen, setLegalOpen] = useState(false);

  const mainLinks = [
    { label: 'Accueil', path: '/', icon: Home },
    { label: 'Découvrir', path: '/discover', icon: Compass },
    { label: 'Vidéos Démo', path: '/videos', icon: Video },
    { label: 'Produits', path: '/products', icon: ShoppingBag },
    { label: 'Créateurs', path: '/creators', icon: Users },
    { label: 'Catégories', path: '/categories', icon: Grid },
    { label: 'Tarifs & Plans', path: '/pricing', icon: Sparkles },
  ];

  const creatorLinks = [
    { label: 'Vue d’ensemble', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Mon Profil & Vitrine', path: '/dashboard/profile', icon: UserIcon },
    { label: 'Mes Produits', path: '/dashboard/products', icon: Package },
    { label: 'Mes Vidéos', path: '/dashboard/videos', icon: Film },
    { label: 'Ma Boutique Chariow', path: '/dashboard/store', icon: Store },
    { label: 'Analytics & Trafic', path: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Mon Abonnement', path: '/dashboard/subscription', icon: CreditCard },
    { label: 'Paramètres & Clés API', path: '/dashboard/settings', icon: Settings },
  ];

  const legalLinks = [
    { label: 'Guide & Algorithme', path: '/guide', icon: Sparkles },
    { label: 'Centre d’aide', path: '/help', icon: HelpCircle },
    { label: 'À propos', path: '/about', icon: Info },
    { label: 'Conditions & Légal', path: '/terms', icon: Shield },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Backdrop: Clicking outside sidebar closes it */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar Container: FIXED, not in scroll, only inner tools scroll. Stops at bottom-14 on mobile so bottom tabs are visible */}
      <aside
        className={`fixed top-16 bottom-14 lg:bottom-0 left-0 z-40 bg-white border-r border-slate-200/80 flex flex-col overflow-hidden transition-all duration-200 ease-in-out select-none ${
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Scrollable Inner Tools List with green scrollbar */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-3 scrollbar-green">
          {/* SECTION 1: Navigation & Découverte */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setNavOpen(!navOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <span>Navigation</span>
                {navOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            ) : (
              <div className="h-2" />
            )}

            {(navOpen || isCollapsed) && (
              <div className="space-y-0.5">
                {mainLinks.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => closeMobileSidebar()}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                        active
                          ? 'bg-amber-400/20 text-slate-900 font-semibold border border-amber-300/50 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-normal'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 text-slate-950 ${
                          active ? 'stroke-[2.5px]' : 'stroke-2'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: Espace Créateur Chariow */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setCreatorOpen(!creatorOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-900 hover:text-amber-950 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Espace Créateur
                </span>
                {creatorOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                )}
              </button>
            ) : (
              <div className="my-1 border-t border-slate-100" />
            )}

            {(creatorOpen || isCollapsed) && (
              <div className="space-y-0.5">
                {creatorLinks.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={user ? item.path : '/auth/login'}
                      onClick={() => closeMobileSidebar()}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                        active
                          ? 'bg-amber-400/20 text-slate-900 font-semibold border border-amber-300/50 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-normal'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 text-slate-950 ${
                          active ? 'stroke-[2.5px]' : 'stroke-2'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 3: Aide & Légal */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setLegalOpen(!legalOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <span>Aide & Support</span>
                {legalOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            ) : (
              <div className="my-1 border-t border-slate-100" />
            )}

            {(legalOpen || isCollapsed) && (
              <div className="space-y-0.5">
                {legalLinks.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => closeMobileSidebar()}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                        active
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-normal'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className="w-4 h-4 text-slate-950 shrink-0 stroke-2" />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM FIXED SECTION: Connected Profile with Photo, Name & Email */}
        <div className="shrink-0 p-2.5 border-t border-slate-200/90 bg-slate-50/90">
          {user ? (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
              {/* Profile Avatar with status ring */}
              <Link
                to="/dashboard/profile"
                onClick={() => closeMobileSidebar()}
                title={profile?.display_name || user.email || 'Mon Profil'}
                className="relative shrink-0 group cursor-pointer"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || 'Avatar'}
                    className="w-9 h-9 rounded-full object-cover border-2 border-amber-400/80 group-hover:border-amber-500 transition-colors shadow-2xs"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs border-2 border-amber-400/80 shadow-2xs">
                    {(profile?.display_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </Link>

              {/* User Identity Details & Direct Sign-out button */}
              {!isCollapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <Link
                    to="/dashboard/profile"
                    onClick={() => closeMobileSidebar()}
                    className="truncate pr-1 group block"
                  >
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-800 transition-colors">
                      {profile?.display_name || user.email?.split('@')[0] || 'Créateur ManuX'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {user.email || 'Compte vérifié'}
                    </p>
                  </Link>

                  {/* Sign out button */}
                  <button
                    type="button"
                    onClick={async () => {
                      closeMobileSidebar();
                      await signOut();
                    }}
                    title="Se déconnecter"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth/login"
              onClick={() => closeMobileSidebar()}
              className={`flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors text-xs font-bold ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <UserIcon className="w-4 h-4 text-amber-400 shrink-0" />
              {!isCollapsed && <span>Se connecter</span>}
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};
