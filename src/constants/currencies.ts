// Currencies the app's forms offer in their currency selectors.
// APP_CURRENCIES is the short list used by expenses, income, and most debt UI.
// EXTENDED_CURRENCIES adds extras only used by the per-person DebtManagement page.
export const APP_CURRENCIES = ['USD', 'EUR', 'RON'] as const;
// NOTE: this list intentionally excludes RON to preserve the existing DebtManagement
// dropdown options. Add RON here if/when that page should match the rest of the app.
export const EXTENDED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const;

export type AppCurrency = (typeof APP_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  RON: 'Lei ',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? '$';
}
