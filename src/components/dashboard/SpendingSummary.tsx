import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { Category, Expense } from '@/interfaces';
interface SpendingSummaryProps {
  expenses: Expense[];
  categories: Category[];
  displayCurrency?: string;
}
const SpendingSummary = ({
  expenses,
  categories,
  displayCurrency = 'USD'
}: SpendingSummaryProps) => {
  return null;
};
export default SpendingSummary;