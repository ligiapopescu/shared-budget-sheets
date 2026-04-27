import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';

interface Props {
  // Distinct currencies that the user's data is recorded in.
  sourceCurrencies: string[];
  displayCurrency: string;
}

// Renders a small warning banner when the user has data in currencies that
// can't be converted to the chosen display currency. Without this banner,
// useCurrencyConverter silently falls back to returning the unconverted
// amount, which the UI then renders with the wrong currency label.
export function MissingRateBanner({ sourceCurrencies, displayCurrency }: Props) {
  const { isRateAvailable, loading } = useCurrencyConverter();

  const missing = useMemo(() => {
    if (loading) return [];
    return Array.from(new Set(sourceCurrencies))
      .filter(c => c && c !== displayCurrency && !isRateAvailable(c, displayCurrency));
  }, [sourceCurrencies, displayCurrency, isRateAvailable, loading]);

  if (missing.length === 0) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Conversion rates missing</p>
        <p className="text-amber-800">
          No rate found from {missing.join(', ')} to {displayCurrency}. Amounts in {missing.length === 1 ? 'that currency' : 'those currencies'} are shown as-is.
          Add rows to the <span className="font-mono">exchange_rates</span> sheet to fix this.
        </p>
      </div>
    </div>
  );
}
