import { SelectItem } from '@/components/ui/select';
import { APP_CURRENCIES, EXTENDED_CURRENCIES, CURRENCY_SYMBOLS } from '@/constants/currencies';

interface Props {
  variant?: 'short' | 'extended';
  withSymbol?: boolean;
}

// Renders <SelectItem> rows for a currency <Select>. Use inside <SelectContent>.
// `variant="extended"` includes GBP/JPY/CAD/AUD in addition to USD/EUR/RON.
// `withSymbol` shows e.g. "USD ($)" rather than just "USD".
export function CurrencySelectItems({ variant = 'short', withSymbol = false }: Props) {
  const list = variant === 'extended' ? EXTENDED_CURRENCIES : APP_CURRENCIES;
  return (
    <>
      {list.map(code => (
        <SelectItem key={code} value={code}>
          {withSymbol ? `${code} (${CURRENCY_SYMBOLS[code]?.trim()})` : code}
        </SelectItem>
      ))}
    </>
  );
}
