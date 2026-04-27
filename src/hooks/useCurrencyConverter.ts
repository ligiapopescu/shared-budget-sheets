import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNumberFormatPreference } from './useNumberFormatPreference';
import { getCurrencySymbol } from '@/constants/currencies';

interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

const deserializeRate = (r: string[]): ExchangeRate => ({
  id: r[0], from_currency: r[1], to_currency: r[2],
  rate: parseFloat(r[3]) || 1, updated_at: r[4] ?? '',
});

export const useCurrencyConverter = () => {
  const { sheetsService } = useAuth();
  const { formatNumber } = useNumberFormatPreference();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sheetsService) return;
    sheetsService.getAll('exchange_rates', deserializeRate)
      .then(setExchangeRates)
      .catch(e => console.error('Error loading exchange rates:', e))
      .finally(() => setLoading(false));
  }, [sheetsService]);

  // Tracks pairs we've already warned about so we don't spam the console
  // when a missing rate appears in 30 rows of a list.
  const warnedPairsRef = useRef<Set<string>>(new Set());

  const isRateAvailable = (fromCurrency: string, toCurrency: string): boolean => {
    if (fromCurrency === toCurrency) return true;
    const direct = exchangeRates.some(r => r.from_currency === fromCurrency && r.to_currency === toCurrency);
    if (direct) return true;
    const toUsd = exchangeRates.some(r => r.from_currency === fromCurrency && r.to_currency === 'USD');
    const fromUsd = exchangeRates.some(r => r.from_currency === 'USD' && r.to_currency === toCurrency);
    return toUsd && fromUsd;
  };

  const convertAmount = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    const direct = exchangeRates.find(r => r.from_currency === fromCurrency && r.to_currency === toCurrency);
    if (direct) return amount * direct.rate;
    const toUsd = exchangeRates.find(r => r.from_currency === fromCurrency && r.to_currency === 'USD');
    const fromUsd = exchangeRates.find(r => r.from_currency === 'USD' && r.to_currency === toCurrency);
    if (toUsd && fromUsd) return amount * toUsd.rate * fromUsd.rate;
    // No rate available. Returning `amount` unchanged means the caller will
    // render a number that's labelled with `toCurrency` but is in fact the
    // value in `fromCurrency`. Callers that care should gate on
    // isRateAvailable() and render a "rate unknown" indicator.
    const pair = `${fromCurrency}->${toCurrency}`;
    if (!warnedPairsRef.current.has(pair) && !loading) {
      warnedPairsRef.current.add(pair);
      console.warn(`[useCurrencyConverter] No exchange rate for ${pair}; returning unconverted amount.`);
    }
    return amount;
  };

  const formatCurrency = (amount: number, currency: string, options?: {
    minimumFractionDigits?: number; maximumFractionDigits?: number;
  }) => `${getCurrencySymbol(currency)}${formatNumber(amount, options)}`;

  return { exchangeRates, loading, convertAmount, isRateAvailable, getCurrencySymbol, formatCurrency, formatNumber };
};
