export interface CountryData {
  code: string; // ISO 2 (CI, CD, SN, CM, etc.)
  name: string; // French name
  officialName: string;
  flagEmoji: string;
  flagUrl?: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  dialCode: string;
}

// Curated comprehensive African and international countries list (instant offline + instant render)
export const DEFAULT_COUNTRIES: CountryData[] = [
  { code: 'CI', name: 'Côte d’Ivoire', officialName: 'République de Côte d’Ivoire', flagEmoji: '🇨🇮', currencyCode: 'XOF', currencyName: 'Franc CFA UEMOA', currencySymbol: 'FCFA', dialCode: '+225' },
  { code: 'CD', name: 'Rép. Dém. du Congo', officialName: 'République Démocratique du Congo', flagEmoji: '🇨🇩', currencyCode: 'CDF', currencyName: 'Franc Congolais', currencySymbol: 'CDF', dialCode: '+243' },
  { code: 'SN', name: 'Sénégal', officialName: 'République du Sénégal', flagEmoji: '🇸🇳', currencyCode: 'XOF', currencyName: 'Franc CFA UEMOA', currencySymbol: 'FCFA', dialCode: '+221' },
  { code: 'CM', name: 'Cameroun', officialName: 'République du Cameroun', flagEmoji: '🇨🇲', currencyCode: 'XAF', currencyName: 'Franc CFA CEMAC', currencySymbol: 'FCFA', dialCode: '+237' },
  { code: 'NG', name: 'Nigéria', officialName: 'Federal Republic of Nigeria', flagEmoji: '🇳🇬', currencyCode: 'NGN', currencyName: 'Naira Nigérian', currencySymbol: '₦', dialCode: '+234' },
  { code: 'KE', name: 'Kenya', officialName: 'Republic of Kenya', flagEmoji: '🇰🇪', currencyCode: 'KES', currencyName: 'Shilling Kenyan', currencySymbol: 'KSh', dialCode: '+254' },
  { code: 'BJ', name: 'Bénin', officialName: 'République du Bénin', flagEmoji: '🇧🇯', currencyCode: 'XOF', currencyName: 'Franc CFA UEMOA', currencySymbol: 'FCFA', dialCode: '+229' },
  { code: 'TG', name: 'Togo', officialName: 'République Togolaise', flagEmoji: '🇹🇬', currencyCode: 'XOF', currencyName: 'Franc CFA UEMOA', currencySymbol: 'FCFA', dialCode: '+228' },
  { code: 'ML', name: 'Mali', officialName: 'République du Mali', flagEmoji: '🇲🇱', currencyCode: 'XOF', currencyName: 'Franc CFA UEMOA', currencySymbol: 'FCFA', dialCode: '+223' },
  { code: 'BF', name: 'Burkina Faso', officialName: 'Burkina Faso', flagEmoji: '🇧🇫', currencyCode: 'XOF', currencyName: 'Franc CFA UEMOA', currencySymbol: 'FCFA', dialCode: '+226' },
  { code: 'NE', name: 'Niger', officialName: 'République du Niger', flagEmoji: '🇳🇪', currencyCode: 'XOF', currencyName: 'Franc CFA UEMOA', currencySymbol: 'FCFA', dialCode: '+227' },
  { code: 'GN', name: 'Guinée', officialName: 'République de Guinée', flagEmoji: '🇬🇳', currencyCode: 'GNF', currencyName: 'Franc Guinéen', currencySymbol: 'FG', dialCode: '+224' },
  { code: 'GA', name: 'Gabon', officialName: 'République Gabonaise', flagEmoji: '🇬🇦', currencyCode: 'XAF', currencyName: 'Franc CFA CEMAC', currencySymbol: 'FCFA', dialCode: '+241' },
  { code: 'CG', name: 'Congo-Brazzaville', officialName: 'République du Congo', flagEmoji: '🇨🇬', currencyCode: 'XAF', currencyName: 'Franc CFA CEMAC', currencySymbol: 'FCFA', dialCode: '+242' },
  { code: 'TD', name: 'Tchad', officialName: 'République du Tchad', flagEmoji: '🇹🇩', currencyCode: 'XAF', currencyName: 'Franc CFA CEMAC', currencySymbol: 'FCFA', dialCode: '+235' },
  { code: 'CF', name: 'Centrafrique', officialName: 'République Centrafricaine', flagEmoji: '🇨🇫', currencyCode: 'XAF', currencyName: 'Franc CFA CEMAC', currencySymbol: 'FCFA', dialCode: '+236' },
  { code: 'RW', name: 'Rwanda', officialName: 'République du Rwanda', flagEmoji: '🇷🇼', currencyCode: 'RWF', currencyName: 'Franc Rwandais', currencySymbol: 'FRw', dialCode: '+250' },
  { code: 'GH', name: 'Ghana', officialName: 'Republic of Ghana', flagEmoji: '🇬🇭', currencyCode: 'GHS', currencyName: 'Cedi Ghanéen', currencySymbol: 'GH₵', dialCode: '+233' },
  { code: 'ZA', name: 'Afrique du Sud', officialName: 'Republic of South Africa', flagEmoji: '🇿🇦', currencyCode: 'ZAR', currencyName: 'Rand Sud-Africain', currencySymbol: 'R', dialCode: '+27' },
  { code: 'MA', name: 'Maroc', officialName: 'Royaume du Maroc', flagEmoji: '🇲🇦', currencyCode: 'MAD', currencyName: 'Dirham Marocain', currencySymbol: 'DH', dialCode: '+212' },
  { code: 'DZ', name: 'Algérie', officialName: 'République Algérienne', flagEmoji: '🇩🇿', currencyCode: 'DZD', currencyName: 'Dinar Algérien', currencySymbol: 'DA', dialCode: '+213' },
  { code: 'TN', name: 'Tunisie', officialName: 'République Tunisienne', flagEmoji: '🇹🇳', currencyCode: 'TND', currencyName: 'Dinar Tunisien', currencySymbol: 'DT', dialCode: '+216' },
  { code: 'EG', name: 'Égypte', officialName: 'Arab Republic of Egypt', flagEmoji: '🇪🇬', currencyCode: 'EGP', currencyName: 'Livre Égyptienne', currencySymbol: 'E£', dialCode: '+20' },
  { code: 'MG', name: 'Madagascar', officialName: 'République de Madagascar', flagEmoji: '🇲🇬', currencyCode: 'MGA', currencyName: 'Ariary Malgache', currencySymbol: 'Ar', dialCode: '+261' },
  { code: 'MU', name: 'Île Maurice', officialName: 'Republic of Mauritius', flagEmoji: '🇲🇺', currencyCode: 'MUR', currencyName: 'Roupie Mauricienne', currencySymbol: '₨', dialCode: '+230' },
  { code: 'FR', name: 'France', officialName: 'République Française', flagEmoji: '🇫🇷', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€', dialCode: '+33' },
  { code: 'BE', name: 'Belgique', officialName: 'Royaume de Belgique', flagEmoji: '🇧🇪', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€', dialCode: '+32' },
  { code: 'CA', name: 'Canada', officialName: 'Canada', flagEmoji: '🇨🇦', currencyCode: 'CAD', currencyName: 'Dollar Canadien', currencySymbol: 'CA$', dialCode: '+1' },
  { code: 'US', name: 'États-Unis', officialName: 'United States of America', flagEmoji: '🇺🇸', currencyCode: 'USD', currencyName: 'US Dollar', currencySymbol: '$', dialCode: '+1' },
  { code: 'GB', name: 'Royaume-Uni', officialName: 'United Kingdom', flagEmoji: '🇬🇧', currencyCode: 'GBP', currencyName: 'Livre Sterling', currencySymbol: '£', dialCode: '+44' },
];

const CACHE_KEY = 'manux_countries_cache_v1';

export class CountryService {
  /**
   * Fetch online countries from RestCountries public open API
   * Falls back seamlessly to curated list if offline or API error
   */
  public static async getCountries(): Promise<CountryData[]> {
    // 1. Check local cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 10) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    // 2. Attempt fetching from free public API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flags,currencies,idd', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const formatted: CountryData[] = [];

        // Build list prioritizing African and partner countries
        data.forEach((c: any) => {
          const code = c.cca2;
          if (!code) return;

          const currencyKey = c.currencies ? Object.keys(c.currencies)[0] : 'USD';
          const currencyObj = c.currencies && currencyKey ? c.currencies[currencyKey] : null;

          // Dial code
          let dial = '';
          if (c.idd && c.idd.root) {
            dial = c.idd.root + (c.idd.suffixes && c.idd.suffixes.length === 1 ? c.idd.suffixes[0] : '');
          }

          formatted.push({
            code,
            name: c.name?.common || code,
            officialName: c.name?.official || code,
            flagEmoji: codeToEmoji(code),
            flagUrl: c.flags?.svg || c.flags?.png,
            currencyCode: currencyKey || 'USD',
            currencyName: currencyObj?.name || currencyKey,
            currencySymbol: currencyObj?.symbol || currencyKey,
            dialCode: dial || '',
          });
        });

        // Merge with curated overrides for francophone accuracy
        const mergedMap = new Map<string, CountryData>();
        // Add defaults first (clean French names)
        DEFAULT_COUNTRIES.forEach((c) => mergedMap.set(c.code, c));
        // Add rest from API
        formatted.forEach((c) => {
          if (!mergedMap.has(c.code)) {
            mergedMap.set(c.code, c);
          }
        });

        const finalList = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(finalList));
        } catch {
          // ignore
        }
        return finalList;
      }
    } catch (err) {
      console.warn('[ManuX Countries] Using curated countries list (network fallback):', err);
    }

    return DEFAULT_COUNTRIES;
  }

  public static getCountryByCode(code: string): CountryData | undefined {
    return DEFAULT_COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  }

  public static getCountryByName(name: string): CountryData | undefined {
    const clean = name.toLowerCase().trim();
    return DEFAULT_COUNTRIES.find(
      (c) => c.name.toLowerCase() === clean || c.officialName.toLowerCase() === clean
    );
  }
}

function codeToEmoji(countryCode: string) {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
