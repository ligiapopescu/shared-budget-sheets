// Default exchange rates seeded into a fresh spreadsheet so multi-currency
// users see plausible conversions out of the box. These are point-in-time
// approximations from early 2026 — fine as a starting point but the user
// is expected to edit the `exchange_rates` sheet for accuracy.
//
// Followups (see PHASE4_PLAN.md):
//   - Pull live rates from a free FX API on app load.
//   - Show rate freshness / "last updated" in the UI.

export interface SeedRate {
  from: string;
  to: string;
  rate: number;
}

// Bidirectional pairs anchored on USD so useCurrencyConverter can pivot
// for any combination of these currencies.
export const DEFAULT_EXCHANGE_RATES: SeedRate[] = [
  { from: 'USD', to: 'EUR', rate: 0.92 },
  { from: 'EUR', to: 'USD', rate: 1.09 },
  { from: 'USD', to: 'GBP', rate: 0.79 },
  { from: 'GBP', to: 'USD', rate: 1.27 },
  { from: 'USD', to: 'RON', rate: 4.55 },
  { from: 'RON', to: 'USD', rate: 0.22 },
  { from: 'USD', to: 'CAD', rate: 1.37 },
  { from: 'CAD', to: 'USD', rate: 0.73 },
  { from: 'USD', to: 'AUD', rate: 1.53 },
  { from: 'AUD', to: 'USD', rate: 0.65 },
  { from: 'USD', to: 'JPY', rate: 151.0 },
  { from: 'JPY', to: 'USD', rate: 0.0066 },
];
