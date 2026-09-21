import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Check, Globe, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { CountryService, CountryData, DEFAULT_COUNTRIES } from '../../services/countries';
import { CurrencyService } from '../../services/currency';
import { useCurrency } from '../../context/CurrencyContext';
import { SupportedCurrency } from '../../types';

interface CurrencyCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCountry?: (country: CountryData) => void;
  title?: string;
  subtitle?: string;
  selectedCountryCode?: string;
}

export const CurrencyCountryModal: React.FC<CurrencyCountryModalProps> = ({
  isOpen,
  onClose,
  onSelectCountry,
  title,
  subtitle,
  selectedCountryCode,
}) => {
  const { currency, setCurrency } = useCurrency();
  const [countries, setCountries] = useState<CountryData[]>(DEFAULT_COUNTRIES);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [ratesUpdatedMsg, setRatesUpdatedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function load() {
      setLoading(true);
      const list = await CountryService.getCountries();
      if (isMounted) {
        setCountries(list);
        setLoading(false);
      }
    }
    load();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleRefreshRates = async () => {
    setRefreshingRates(true);
    try {
      await CurrencyService.refreshLiveRates();
      setRatesUpdatedMsg('Taux de change mis à jour en direct !');
      setTimeout(() => setRatesUpdatedMsg(null), 3000);
    } catch {
      setRatesUpdatedMsg('Taux disponibles chargés.');
    } finally {
      setRefreshingRates(false);
    }
  };

  const filteredCountries = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.officialName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q) ||
        c.currencyName.toLowerCase().includes(q)
    );
  }, [search, countries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Fermer la fenêtre modale"
      />

      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Chariow Yellow Accent */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50/50 via-white to-emerald-50/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold shadow-xs">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-serif-heading">
                  {title || "Pays & Devise d'affichage"}
                </h3>
                <p className="text-xs text-slate-500">
                  {subtitle || "Choisissez votre pays ou devise préférée pour visualiser les prix locaux"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar & Refresh rates button */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par pays, code ou devise (ex: Congo, XOF, USD, €)..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-amber-400 focus:outline-none transition-all"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Effacer
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleRefreshRates}
              disabled={refreshingRates}
              title="Rafraîchir les taux de conversion en direct via l'API"
              className="px-3 py-2 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingRates ? 'animate-spin text-amber-600' : ''}`} />
              <span className="hidden sm:inline">Taux direct</span>
            </button>
          </div>

          {ratesUpdatedMsg && (
            <div className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{ratesUpdatedMsg}</span>
            </div>
          )}
        </div>

        {/* Countries / Currencies List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <span>Chargement des pays et devises disponibles...</span>
            </div>
          ) : filteredCountries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Aucun pays trouvé pour « {search} ».
            </div>
          ) : (
            filteredCountries.map((c) => {
              const isSelected = selectedCountryCode
                ? selectedCountryCode.toLowerCase() === c.code.toLowerCase() || selectedCountryCode.toLowerCase() === c.name.toLowerCase()
                : currency === c.currencyCode;
              const rateAgainstUSD = CurrencyService.convert(1, 'USD', c.currencyCode as any);

              return (
                <button
                  key={`${c.code}-${c.currencyCode}`}
                  type="button"
                  onClick={() => {
                    if (onSelectCountry) {
                      onSelectCountry(c);
                    } else {
                      setCurrency(c.currencyCode as SupportedCurrency);
                    }
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                    isSelected
                      ? 'bg-amber-50 border border-amber-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none shrink-0">{c.flagEmoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{c.name}</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.currencyName} ({c.currencySymbol})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 block">
                        {c.currencyCode}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ≈ {rateAgainstUSD.formatted} / $1
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info note */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-[11px] font-medium text-slate-500 text-center flex items-center justify-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
          <span>
            Les conversions de devises sont fournies à titre indicatif selon les taux réels du marché officiel.
          </span>
        </div>
      </div>
    </div>
  );
};
