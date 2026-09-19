import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Package,
  Plus,
  LayoutDashboard,
  MoreHorizontal,
  Video,
  Users,
  Grid,
  Search,
  Store,
  BarChart3,
  CreditCard,
  User,
  Settings,
  HelpCircle,
  Info,
  LogOut,
  LogIn,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleCreateClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      navigate('/auth/login');
    }
  };

  const isMoreActive =
    sheetOpen ||
    ['/videos', '/creators', '/categories', '/search', '/pricing', '/about', '/help', '/dashboard/videos', '/dashboard/store', '/dashboard/analytics', '/dashboard/subscription', '/dashboard/profile', '/dashboard/settings'].some(
      (p) => location.pathname.startsWith(p)
    );

  const publicLinks = [
    { label: 'Vidéos Démo', path: '/videos', icon: Video, desc: 'Toutes les vidéos YouTube de démo' },
    { label: 'Créateurs', path: '/creators', icon: Users, desc: 'Communauté et profils des vendeurs' },
    { label: 'Catégories', path: '/categories', icon: Grid, desc: 'Explorer par domaine d’activité' },
    { label: 'Recherche Avancée', path: '/search', icon: Search, desc: 'Trouver un produit ou une vidéo' },
    { label: 'Tarifs & Offres', path: '/pricing', icon: CreditCard, desc: 'Plans Gratuit, Créateur et Pro' },
  ];

  const dashboardLinks = [
    { label: 'Ma Boutique Chariow', path: '/dashboard/store', icon: Store, desc: 'Connecter et synchroniser votre boutique' },
    { label: 'Mes Vidéos de Démo', path: '/dashboard/videos', icon: Video, desc: 'Gérer vos présentations YouTube' },
    { label: 'Analytics & Graphiques', path: '/dashboard/analytics', icon: BarChart3, desc: 'Clics Chariow, vues et conversions' },
    { label: 'Abonnement & Forfaits', path: '/dashboard/subscription', icon: CreditCard, desc: 'Gérer votre plan et vos limites' },
    { label: 'Mon Profil Créateur', path: '/dashboard/profile', icon: User, desc: 'Bio, pays, réseaux et visuel' },
    { label: 'Paramètres du Compte', path: '/dashboard/settings', icon: Settings, desc: 'Sécurité et préférences' },
  ];

  return (
    <>
      {/* MASTER MOBILE BOTTOM NAVIGATION (Fixed at bottom on mobile screens) */}
      <nav
        id="manux-master-bottom-tabs"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 sm:hidden pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none"
        style={{ isolation: 'isolate' }}
      >
        <div className="grid grid-cols-5 h-14 items-center">
          {/* 1. ACCUEIL */}
          <Link
            to="/"
            onClick={() => setSheetOpen(false)}
            className={`flex flex-col items-center justify-center text-center transition-colors h-full ${
              isActive('/') && !sheetOpen ? 'text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${isActive('/') && !sheetOpen ? 'bg-amber-400/20 text-slate-950' : ''}`}>
              <Home className={`w-4 h-4 ${isActive('/') && !sheetOpen ? 'text-amber-600 stroke-[2.5]' : 'text-slate-500'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 ${isActive('/') && !sheetOpen ? 'font-black text-slate-950' : 'text-slate-500 font-medium'}`}>
              Accueil
            </span>
          </Link>

          {/* 2. PRODUITS */}
          <Link
            to="/products"
            onClick={() => setSheetOpen(false)}
            className={`flex flex-col items-center justify-center text-center transition-colors h-full ${
              isActive('/products') && !sheetOpen ? 'text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${isActive('/products') && !sheetOpen ? 'bg-amber-400/20 text-slate-950' : ''}`}>
              <Package className={`w-4 h-4 ${isActive('/products') && !sheetOpen ? 'text-amber-600 stroke-[2.5]' : 'text-slate-500'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 ${isActive('/products') && !sheetOpen ? 'font-black text-slate-950' : 'text-slate-500 font-medium'}`}>
              Produits
            </span>
          </Link>

          {/* 3. CRÉER (Bouton d'action central surélevé) */}
          <Link
            to={user ? '/dashboard/products' : '/auth/login'}
            onClick={(e) => {
              setSheetOpen(false);
              handleCreateClick(e);
            }}
            className="flex flex-col items-center justify-center text-center group h-full"
          >
            <div className="w-10 h-10 -mt-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white group-active:scale-90 transition-transform">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-black text-slate-900 mt-0.5">
              Créer
            </span>
          </Link>

          {/* 4. DASHBOARD / ESPACE CRÉATEUR */}
          <Link
            to={user ? '/dashboard' : '/auth/login'}
            onClick={() => setSheetOpen(false)}
            className={`flex flex-col items-center justify-center text-center transition-colors h-full ${
              (location.pathname === '/dashboard' || location.pathname === '/auth/login') && !sheetOpen
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${(location.pathname === '/dashboard' || location.pathname === '/auth/login') && !sheetOpen ? 'bg-amber-400/20 text-slate-950' : ''}`}>
              <LayoutDashboard className={`w-4 h-4 ${(location.pathname === '/dashboard' || location.pathname === '/auth/login') && !sheetOpen ? 'text-amber-600 stroke-[2.5]' : 'text-slate-500'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 ${(location.pathname === '/dashboard' || location.pathname === '/auth/login') && !sheetOpen ? 'font-black text-slate-950' : 'text-slate-500 font-medium'}`}>
              Dashboard
            </span>
          </Link>

          {/* 5. PLUS (Ouvre le tiroir complet avec tout le reste du menu) */}
          <button
            type="button"
            onClick={() => setSheetOpen(!sheetOpen)}
            className={`flex flex-col items-center justify-center text-center transition-colors h-full cursor-pointer ${
              sheetOpen || isMoreActive ? 'text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${sheetOpen || isMoreActive ? 'bg-amber-400/20 text-slate-950' : ''}`}>
              <MoreHorizontal className={`w-4 h-4 ${sheetOpen || isMoreActive ? 'text-amber-600 stroke-[2.5]' : 'text-slate-500'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 ${sheetOpen || isMoreActive ? 'font-black text-slate-950' : 'text-slate-500 font-medium'}`}>
              Plus
            </span>
          </button>
        </div>
      </nav>

      {/* SLIDE-UP BOTTOM SHEET FOR "PLUS" (Affiche toutes les pages restantes de la plateforme) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[99999] sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet Body */}
          <div className="absolute bottom-14 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl shadow-[0_-10px_35px_rgba(0,0,0,0.2)] border-t border-slate-200 animate-in slide-in-from-bottom duration-250 max-h-[85vh] flex flex-col overflow-hidden pb-safe">
            {/* Handle bar & Header */}
            <div className="pt-2 px-4 pb-3 border-b border-slate-100 flex flex-col bg-slate-50/90 rounded-t-3xl shrink-0">
              {/* Drag indicator pill */}
              <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-2.5 opacity-80" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-2xs">
                    MX
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                      Menu & Navigation ManuX
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Accès direct à toutes les rubriques
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Fermer le menu"
                  className="p-1.5 rounded-full bg-white text-slate-600 hover:text-slate-950 border border-slate-200 shadow-2xs cursor-pointer active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content with optimized mobile touch and green indicator */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 touch-pan-y">
              {/* SECTION: Espace Créateur si connecté */}
              {user && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      Espace Créateur & Gestion
                    </span>
                    {profile?.username && (
                      <Link
                        to={`/creators/${profile.username}`}
                        onClick={() => setSheetOpen(false)}
                        className="text-[10px] font-bold text-slate-700 hover:text-amber-800 flex items-center gap-1"
                      >
                        <span>Voir ma vitrine</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {dashboardLinks.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSheetOpen(false)}
                          className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                            active
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${active ? 'bg-slate-800 text-amber-400' : 'bg-white text-slate-700 border border-slate-200/60'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <div className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-900'}`}>
                                {item.label}
                              </div>
                              <div className={`text-[10px] ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                                {item.desc}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: Découverte & Public */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
                  Découvrir la Plateforme
                </span>

                <div className="grid grid-cols-1 gap-1.5">
                  {publicLinks.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSheetOpen(false)}
                        className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                          active
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${active ? 'bg-slate-800 text-amber-400' : 'bg-white text-slate-700 border border-slate-200/60'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-900'}`}>
                              {item.label}
                            </div>
                            <div className={`text-[10px] ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                              {item.desc}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: Support & Compte */}
              <div className="pt-2 border-t border-slate-100 space-y-2 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/help"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold border border-slate-100"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Centre d'Aide</span>
                  </Link>

                  <Link
                    to="/about"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold border border-slate-100"
                  >
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>À Propos</span>
                  </Link>
                </div>

                {user ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setSheetOpen(false);
                      await signOut();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Se déconnecter de ManuX</span>
                  </button>
                ) : (
                  <Link
                    to="/auth/login"
                    onClick={() => setSheetOpen(false)}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors shadow-2xs"
                  >
                    <LogIn className="w-3.5 h-3.5 text-amber-400" />
                    <span>Connexion / Inscription Créateur</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
