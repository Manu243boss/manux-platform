import { SupportedCurrency } from '../types';

/**
 * Currency Service
 * Supports CDF (Franc Congolais), USD, XOF (Franc CFA UEMOA), XAF (Franc CFA CEMAC), EUR, KES (Kenyan Shilling), NGN (Nigerian Naira), GHS (Ghanaian Cedi), etc.
 * Uses a free public real-time exchange rates API (https://open.er-api.com/v6/latest/USD) with localStorage caching.
 * Never alters the seller's original listed price.
 */

const CACHE_KEY = 'manux_exchange_rates_v1';
const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours

export class CurrencyService {
  // Authoritative base fallback rates against 1 USD
  private static rates: Record<string, number> = {
    USD: 1.0,
    CDF: 2850.0, // Franc Congolais
    XOF: 610.0,  // Franc CFA UEMOA
    XAF: 610.0,  // Franc CFA CEMAC
    EUR: 0.92,   // Euro
    KES: 129.5,  // Kenyan Shilling
    NGN: 1540.0, // Nigerian Naira
    GHS: 15.5,   // Cedi
    ZAR: 18.2,   // Rand
    GBP: 0.77,   // Livre Sterling
    CAD: 1.36,   // Dollar Canadien
    MAD: 9.8,    // Dirham
  };

  private static symbols: Record<string, string> = {
    USD: '$',
    CDF: 'CDF',
    XOF: 'FCFA',
    XAF: 'FCFA',
    EUR: '€',
    KES: 'KSh',
    NGN: '₦',
    GHS: 'GH₵',
    ZAR: 'R',
    GBP: '£',
    CAD: 'CA$',
    MAD: 'DH',
  };

  private static lastFetched: number = 0;

  /**
   * Initialize and refresh live rates from public open exchange rate API
   */
  public static async refreshLiveRates(): Promise<void> {
    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_EXPIRY_MS && parsed.rates) {
          this.rates = { ...this.rates, ...parsed.rates };
          this.lastFetched = parsed.timestamp;
          return;
        }
      }

      // Fetch live rates from public API (free, open, no key required)
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data.result === 'success' && data.rates) {
          // Merge rates
          this.rates = {
            ...this.rates,
            USD: 1.0,
            EUR: data.rates.EUR || this.rates.EUR,
            XOF: data.rates.XOF || 610,
            XAF: data.rates.XAF || 610,
            CDF: data.rates.CDF || 2850,
            NGN: data.rates.NGN || 1540,
            KES: data.rates.KES || 130,
            GHS: data.rates.GHS || 15.5,
            ZAR: data.rates.ZAR || 18.2,
            CAD: data.rates.CAD || 1.36,
            GBP: data.rates.GBP || 0.77,
          };
          this.lastFetched = Date.now();
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: this.lastFetched, rates: this.rates })
          );
        }
      }
    } catch (err) {
      console.warn('[ManuX Currency] Using cached or baseline exchange rates:', err);
    }
  }

  public static getSupportedCurrencies(): SupportedCurrency[] {
    return ['CDF', 'USD', 'XAF', 'XOF', 'EUR', 'KES', 'NGN'] as SupportedCurrency[];
  }

  public static getSymbol(currency: string): string {
    const code = currency.toUpperCase();
    return this.symbols[code] || code;
  }

  /**
   * Format original price as authoritative string
   */
  public static formatOriginal(amount: number, currency: string): string {
    const code = currency.toUpperCase();
    const formattedNum = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: code === 'USD' || code === 'EUR' || code === 'GBP' ? 2 : 0,
      minimumFractionDigits: code === 'USD' || code === 'EUR' || code === 'GBP' ? 2 : 0,
    }).format(amount);

    if (code === 'USD') return `$${formattedNum} USD`;
    if (code === 'EUR') return `${formattedNum} €`;
    if (code === 'XOF' || code === 'XAF') return `${formattedNum} FCFA`;
    return `${formattedNum} ${code}`;
  }

  /**
   * Convert price from one currency to target currency (indicative rate)
   */
  public static convert(amount: number, from: string, to: SupportedCurrency | string): {
    convertedAmount: number;
    formatted: string;
    isIndicative: boolean;
  } {
    const fromCode = from.toUpperCase();
    const toCode = to.toUpperCase();

    if (fromCode === toCode) {
      return {
        convertedAmount: amount,
        formatted: this.formatOriginal(amount, fromCode),
        isIndicative: false,
      };
    }

    const fromRateToUSD = this.rates[fromCode] || 1.0;
    const toRateToUSD = this.rates[toCode] || 1.0;

    // Convert: (amount / fromRate) * toRate
    const amountInUSD = amount / fromRateToUSD;
    const convertedAmount = amountInUSD * toRateToUSD;

    const formattedNum = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: toCode === 'USD' || toCode === 'EUR' || toCode === 'GBP' ? 2 : 0,
      minimumFractionDigits: toCode === 'USD' || toCode === 'EUR' || toCode === 'GBP' ? 2 : 0,
    }).format(convertedAmount);

    let formatted = `${formattedNum} ${toCode}`;
    if (toCode === 'USD') formatted = `$${formattedNum}`;
    if (toCode === 'EUR') formatted = `${formattedNum} €`;
    if (toCode === 'XOF' || toCode === 'XAF') formatted = `${formattedNum} FCFA`;

    return {
      convertedAmount,
      formatted,
      isIndicative: true,
    };
  }
}

// Auto-trigger rate refresh in background
CurrencyService.refreshLiveRates();
