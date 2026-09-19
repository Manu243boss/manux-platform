import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedCurrency } from '../types';
import { CurrencyService } from '../services/currency';
import { supabase } from '../lib/supabase';

interface CurrencyContextType {
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => Promise<void>;
  formatPrice: (amount: number, originalCurrency: string) => {
    primary: string;
    secondary?: string;
  };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    const saved = localStorage.getItem('manux_preferred_currency');
    return (saved as SupportedCurrency) || 'CDF';
  });

  // Sync with Supabase on mount if authenticated
  useEffect(() => {
    const checkUserCurrency = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_currency')
            .eq('id', session.user.id)
            .single();

          if (profile?.preferred_currency) {
            setCurrencyState(profile.preferred_currency as SupportedCurrency);
            localStorage.setItem('manux_preferred_currency', profile.preferred_currency);
          }
        }
      } catch {
        // Fallback to local
      }
    };

    checkUserCurrency();
  }, []);

  const setCurrency = async (newCurrency: SupportedCurrency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('manux_preferred_currency', newCurrency);

    // Save to Supabase if logged in
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ preferred_currency: newCurrency })
          .eq('id', session.user.id);
      }
    } catch {
      // Ignore
    }
  };

  const formatPrice = (amount: number, originalCurrency: string) => {
    const origStr = CurrencyService.formatOriginal(amount, originalCurrency);
    if (originalCurrency.toUpperCase() === currency.toUpperCase()) {
      return { primary: origStr };
    }
    const conv = CurrencyService.convert(amount, originalCurrency, currency);
    return {
      primary: origStr,
      secondary: conv.formatted,
    };
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
