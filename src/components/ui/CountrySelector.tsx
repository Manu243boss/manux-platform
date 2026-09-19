import React, { useState, useEffect, useMemo } from 'react';
import { Search, Globe, Check, ChevronDown, X } from 'lucide-react';
import { CountryService, CountryData, DEFAULT_COUNTRIES } from '../../services/countries';

interface CountrySelectorProps {
  value: string; // Country name or code
  onChange: (country: CountryData) => void;
  label?: string;
  className?: string;
  autoCurrency?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  label = 'Pays d’activité',
  className = '',
}) => {
  const [countries, setCountries] = useState<CountryData[]>(DEFAULT_COUNTRIES);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  }, []);

  const selectedCountry = useMemo(() => {
    if (!value) return countries[0];
    const match = countries.find(
      (c) =>
        c.name.toLowerCase() === value.toLowerCase() ||
        c.code.toLowerCase() === value.toLowerCase() ||
        c.officialName.toLowerCase() === value.toLowerCase()
    );
    return match || countries[0];
  }, [value, countries]);

  const filteredCountries = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.officialName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [search, countries]);

  const handleSelect = (c: CountryData) => {
    onChange(c);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`space-y-1 relative ${className}`}>
      {label && (
        <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[11px] font-normal text-slate-700 flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-700" />
            Devise liée : <strong className="text-slate-950 font-bold">{selectedCountry?.currencyCode || 'XOF'}</strong>
          </span>
        </label>
      )}

      {/* Button to open selector */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-xs"
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className="text-xl shrink-0 leading-none">{selectedCountry?.flagEmoji || '🌍'}</span>
          <span className="text-xs sm:text-sm font-semibold text-slate-950 truncate">
            {selectedCountry?.name || 'Sélectionner un pays'}
          </span>
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 shrink-0">
            {selectedCountry?.currencyCode}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-700 shrink-0" />
      </button>

      {/* Search Modal / Popover Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed md:absolute top-1/2 md:top-full left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 -translate-y-1/2 md:translate-y-1 z-50 w-[92vw] sm:w-[420px] max-h-[80vh] md:max-h-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header / Search Input */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-700 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher pays, devise (ex: Sénégal, CDF, XOF)..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-950 font-medium placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-200/60 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-slate-50">
              {filteredCountries.length === 0 ? (
                <div className="py-8 text-center text-xs font-semibold text-slate-700">
                  Aucun pays correspondant à votre recherche.
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected =
                    selectedCountry &&
                    (selectedCountry.code === c.code || selectedCountry.name === c.name);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
                          : 'hover:bg-slate-100 text-slate-950'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate pr-2">
                        <span className="text-xl leading-none shrink-0">{c.flagEmoji}</span>
                        <div className="truncate">
                          <div className="text-xs sm:text-sm font-bold text-slate-950 truncate">
                            {c.name}
                          </div>
                          <div className="text-[11px] font-medium text-slate-700">
                            {c.currencyName} ({c.currencyCode}) • Indicatif {c.dialCode}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 border border-slate-200">
                          {c.currencyCode}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-2.5 bg-slate-100/80 border-t border-slate-200 text-center text-[11px] font-medium text-slate-700">
              API pays et devises en ligne • Actualisation automatique des devises
            </div>
          </div>
        </>
      )}
    </div>
  );
};
