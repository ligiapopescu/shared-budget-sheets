import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CurrencySelectorProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

const CurrencySelector = ({
  selectedCurrency,
  onCurrencyChange
}: CurrencySelectorProps) => {
  const currencies = [{
    code: 'USD',
    label: 'USD ($)',
    symbol: '$',
    emoji: '🇺🇸'
  }, {
    code: 'EUR',
    label: 'EUR (€)',
    symbol: '€',
    emoji: '🇪🇺'
  }, {
    code: 'RON',
    label: 'RON (Lei)',
    symbol: 'Lei',
    emoji: '🇷🇴'
  }];

  return (
    <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
      <SelectTrigger 
        id="currency-select" 
        className="w-36 rounded-full border-2 border-border bg-card shadow-soft hover:shadow-pink transition-all duration-200"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-2 border-border bg-card shadow-soft">
        {currencies.map(currency => (
          <SelectItem 
            key={currency.code} 
            value={currency.code}
            className="rounded-lg hover:bg-pink-light focus:bg-pink-light"
          >
            <span className="flex items-center gap-2">
              <span>{currency.emoji}</span>
              <span>{currency.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
