import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Globe,
  PlusCircle,
  Store,
  ExternalLink,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  Grid,
  X,
  Package,
  Video,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useSidebar } from '../../context/SidebarContext';
import { CurrencyCountryModal } from '../ui/CurrencyCountryModal';
import { NotificationBell } from './NotificationBell';
import { Logo } from '../ui/Logo';
import { supabase } from '../../lib/supabase';
import { CurrencyService } from '../../services/currency';

export const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { currency } = useCurrency();
  const { toggleSidebar, toggleCollapse } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Live Instant Search State
  const [isSearching, setIsSearching] = useState(false);
  const [isLiveDropdownOpen, setIsLiveDropdownOpen] = useState(false);
  const [liveResults, setLiveResults] = useState<{
    products: any[];
    creators: any[];
    videos: any[];
  }>({ products: [], creators: [], videos: [] });

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search query so user typing immediately triggers results without hitting Enter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute live search whenever debounced query updates
  useEffect(() => {
    let active = true;

    async function fetchLiveResults() {
      if (!debouncedQuery || debouncedQuery.length < 1) {
        setLiveResults({ products: [], creators: [], videos: [] });
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const term = `%${debouncedQuery}%`;

        const [pRes, cRes, vRes] = await Promise.all([
          // 1. Products (title match)
          supabase
            .from('products')
            .select('id, title, slug, price, currency, thumbnail_url, main_image_url, metadata')
            .ilike('title', term)
            .eq('status', 'published')
            .limit(4),
          // 2. Creator Profiles (display_name or username match)
          supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, bio, country')
            .or(`display_name.ilike.${term},username.ilike.${term}`)
            .limit(4),
          // 3. Demonstration Videos (title match)
          supabase
            .from('videos')
            .select('id, title, slug, thumbnail_url, youtube_video_id')
            .ilike('title', term)
            .eq('status', 'published')
            .limit(3),
        ]);

        if (active) {
          setLiveResults({
            products: pRes.data || [],
            creators: cRes.data || [],
            videos: vRes.data || [],
          });
          setIsLiveDropdownOpen(true);
        }
      } catch (err) {
        console.error('[ManuX Navbar Live Search] Error:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    }

    fetchLiveResults();

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        mobileSearchContainerRef.current &&
        !mobileSearchContainerRef.current.contains(event.target as Node)
      ) {
        setIsLiveDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsLiveDropdownOpen(false);
      setIsMobileSearchOpen(false);
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleSelectResult = (url: string) => {
    setIsLiveDropdownOpen(false);
    setIsMobileSearchOpen(false);
    window.location.href = url;
  };

  const hasAnyResults =
    liveResults.products.length > 0 ||
    liveResults.creators.length > 0 ||
    liveResults.videos.length > 0;

  return (
    <>
      {/* Currency & Country Modal */}
      <CurrencyCountryModal
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
      />

      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200/90 shadow-2xs h-16">
        <div className="h-full px-3 sm:px-5 flex items-center justify-between gap-3">
          {/* Left: Hamburger Menu & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  toggleCollapse();
                } else {
                  toggleSidebar();
                }
              }}
              aria-label="Menu de navigation"
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <a href="/" className="flex items-center">
              <Logo size="md" subtitle="Chariow Gateway" />
            </a>
          </div>

          {/* Center: Desktop Search Bar with Live Suggestions Dropdown */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-lg mx-2 hidden md:block">
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <div className="relative w-full flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) setIsLiveDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim().length > 0) setIsLiveDropdownOpen(true);
                  }}
                  placeholder="Rechercher produits, démos vidéo, créateurs..."
                  className="w-full pl-4 pr-10 py-1.5 text-xs sm:text-sm rounded-l-full border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-amber-400 shadow-inner-2xs transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsLiveDropdownOpen(false);
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                aria-label="Lancer la recherche"
                className="px-4 py-2 bg-slate-100 hover:bg-amber-400 hover:text-slate-950 text-slate-600 border border-l-0 border-slate-200 rounded-r-full flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </form>

            {/* Live Instant Search Results Dropdown */}
            {isLiveDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    {isSearching ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                        <span>Recherche en direct...</span>
                      </>
                    ) : (
                      <span>Résultats instantanés pour « {searchQuery} »</span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Entrée pour tout voir</span>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-1">
                  {/* Creator Profiles */}
                  {liveResults.creators.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-600 tracking-wider">
                        Comptes & Créateurs
                      </div>
                      {liveResults.creators.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectResult(`/creators/${c.username}`)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50/70 cursor-pointer transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                            {c.avatar_url ? (
                              <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              c.display_name?.[0] || 'C'
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800 truncate">
                              {c.display_name}
                            </div>
                            <div className="text-[10px] text-slate-600 truncate">
                              @{c.username} {c.country ? `• ${c.country}` : ''}
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Products */}
                  {liveResults.products.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-600 tracking-wider">
                        Produits & Formations
                      </div>
                      {liveResults.products.map((p) => {
                        const img = p.thumbnail_url || p.main_image_url || p.metadata?.pictures?.thumbnail;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectResult(`/products/${p.slug}`)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50/70 cursor-pointer transition-colors group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {img ? (
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800 truncate">
                                {p.title}
                              </div>
                              <div className="text-[10px] font-black text-amber-900">
                                {p.price} {p.currency}
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Videos */}
                  {liveResults.videos.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-600 tracking-wider">
                        Démonstrations Vidéo
                      </div>
                      {liveResults.videos.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => handleSelectResult(`/videos/${v.slug}`)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50/70 cursor-pointer transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-900 text-rose-500 overflow-hidden shrink-0 flex items-center justify-center">
                            <Video className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800 truncate">
                              {v.title}
                            </div>
                            <div className="text-[10px] text-emerald-800 font-semibold">
                              Démonstration produit
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasAnyResults && !isSearching && (
                    <div className="p-4 text-center text-xs text-slate-600">
                      Aucun résultat immédiat. Appuyez sur <span className="font-bold text-slate-900">Entrée</span> pour lancer la recherche approfondie.
                    </div>
                  )}
                </div>

                <div
                  onClick={handleSearchSubmit}
                  className="p-2.5 bg-slate-50 hover:bg-amber-100 text-center text-xs font-bold text-slate-900 cursor-pointer transition-colors border-t border-slate-100 flex items-center justify-center gap-1.5"
                >
                  <span>Voir tous les résultats pour « {searchQuery} »</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
                </div>
              </div>
            )}
          </div>

          {/* Right Actions: Store Showcase Badge, Currency Modal Trigger, Mobile Search Button, Create & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Search Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Ouvrir la recherche"
            >
              <Search className="w-4 h-4" />
            </button>
            {/* Topbar Store & Showcase Indicator */}
            {user && profile?.username && (
              <div className="hidden lg:flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/90 rounded-xl px-2.5 py-1 text-xs text-amber-950">
                <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-semibold max-w-[110px] truncate text-[11px]">
                  {profile.display_name || profile.username}
                </span>
                <a
                  href={`/creators/${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ouvrir ma vitrine publique"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-amber-950 text-[10px] font-black shadow-2xs transition-colors"
                >
                  <span>Visiter</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}

            {/* Notification Bell */}
            <NotificationBell />

            {/* Currency & Country Modal Trigger */}
            <button
              type="button"
              onClick={() => setCountryModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-bold text-slate-900">{currency}</span>
            </button>

            {/* Quick "Créer / Publier" Action */}
            <a
              href={user ? '/dashboard/products' : '/auth/register'}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-2xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Créer</span>
            </a>

            {/* Profile / Auth Menu */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-amber-300 transition-all cursor-pointer"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || 'Profil'}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center border border-slate-200">
                      {profile?.display_name?.slice(0, 1).toUpperCase() || 'M'}
                    </div>
                  )}
                </button>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3.5 py-2.5">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {profile?.display_name || 'Créateur ManuX'}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 truncate">
                          @{profile?.username || user.email}
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                          {profile?.profile_type || 'Créateur'}
                        </span>
                      </div>

                      <div className="py-1">
                        <a
                          href="/dashboard"
                          className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                        >
                          <LayoutDashboard className="w-4 h-4 text-slate-400" />
                          <span>Dashboard & Analytics</span>
                        </a>

                        {profile?.username && (
                          <a
                            href={`/creators/${profile.username}`}
                            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                          >
                            <UserIcon className="w-4 h-4 text-slate-400" />
                            <span>Ma vitrine publique</span>
                          </a>
                        )}

                        <a
                          href="/dashboard/store"
                          className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                        >
                          <Store className="w-4 h-4 text-slate-400" />
                          <span>Ma boutique Chariow</span>
                        </a>

                        <a
                          href="/dashboard/settings"
                          className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                        >
                          <Grid className="w-4 h-4 text-slate-400" />
                          <span>Paramètres & Profil</span>
                        </a>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setProfileDropdownOpen(false);
                            await signOut();
                            window.location.href = '/';
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Déconnexion</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <a
                  href="/auth/login"
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Connexion
                </a>
                <a
                  href="/auth/register"
                  className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-2xs transition-colors"
                >
                  S'inscrire
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Input Drawer (when toggled on mobile) */}
        {isMobileSearchOpen && (
          <div ref={mobileSearchContainerRef} className="md:hidden border-t border-slate-200 bg-white p-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length > 0) setIsLiveDropdownOpen(true);
                }}
                placeholder="Rechercher titre, profil ou compte..."
                className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-400 font-medium"
              />
              <button
                type="submit"
                className="absolute right-1.5 p-1.5 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-500"
                aria-label="Rechercher"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </form>

            {/* Mobile Live Results */}
            {isLiveDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-72 overflow-y-auto shadow-md">
                {liveResults.creators.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectResult(`/creators/${c.username}`)}
                    className="flex items-center gap-2.5 p-2.5 hover:bg-amber-50 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        c.display_name?.[0] || 'C'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{c.display_name}</div>
                      <div className="text-[10px] text-slate-600 truncate">@{c.username}</div>
                    </div>
                  </div>
                ))}

                {liveResults.products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectResult(`/products/${p.slug}`)}
                    className="flex items-center gap-2.5 p-2.5 hover:bg-amber-50 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{p.title}</div>
                      <div className="text-[10px] font-black text-amber-900">{p.price} {p.currency}</div>
                    </div>
                  </div>
                ))}

                {liveResults.videos.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleSelectResult(`/videos/${v.slug}`)}
                    className="flex items-center gap-2.5 p-2.5 hover:bg-amber-50 cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{v.title}</div>
                    </div>
                  </div>
                ))}

                <div
                  onClick={handleSearchSubmit}
                  className="p-2 text-center text-xs font-bold text-amber-900 bg-amber-50 cursor-pointer"
                >
                  Voir tous les résultats pour « {searchQuery} » →
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
};
