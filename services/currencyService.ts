
import { ExchangeRates } from '../types';

export const PRIMARY_CURRENCY = 'CAD';

// Fallback rates in case API fails
const DEFAULT_RATES: ExchangeRates = {
  'CAD': 1.0,
  'USD': 1.38,
  'EUR': 1.50,
  'GBP': 1.75,
  'AUD': 0.91,
  'JPY': 0.0092,
  'CNY': 0.19,
  'INR': 0.016,
  'CHF': 1.55,
  'MXN': 0.08
};

/**
 * Fetches real-time exchange rates relative to CAD from Frankfurter API.
 * Converts "1 CAD = X Foreign" (API format) to "1 Foreign = X CAD" (Multiplier format).
 */
export const fetchLiveRates = async (): Promise<ExchangeRates> => {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=CAD');
    if (!res.ok) throw new Error('Failed to fetch rates');
    
    const data = await res.json();
    
    const rates: ExchangeRates = { 'CAD': 1.0 };
    
    // The API returns rates where 1 CAD = X Foreign Currency.
    // We need the inverse (multiplier) to convert Foreign -> CAD.
    if (data && data.rates) {
        Object.entries(data.rates as Record<string, number>).forEach(([currency, rate]) => {
            if (rate !== 0) {
                rates[currency] = 1 / rate;
            }
        });
    }
    
    return rates;
  } catch (error) {
    console.warn('Currency API failed, using fallbacks:', error);
    return DEFAULT_RATES;
  }
};

export const convertToBase = (amount: number, currency: string = 'CAD', rates: ExchangeRates = DEFAULT_RATES): number => {
  if (!currency) return amount;
  const code = currency.toUpperCase().trim();
  
  // Use provided rates map or fallback to defaults
  const rate = rates[code] !== undefined ? rates[code] : 1.0; 
  
  return amount * rate;
};

export const formatBaseCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { 
        style: 'currency', 
        currency: PRIMARY_CURRENCY,
        maximumFractionDigits: 0 
    }).format(amount);
};

export const formatNativeCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-CA', { 
            style: 'currency', 
            currency: currency || PRIMARY_CURRENCY,
            maximumFractionDigits: 0
        }).format(amount);
    } catch (e) {
        // Fallback for invalid currency codes
        return `${currency || '$'} ${amount.toLocaleString()}`;
    }
};
