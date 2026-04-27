import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { Category, Expense, Income } from '@/interfaces';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DashboardStatsProps {
  expenses: Expense[];
  incomes: Income[];
  categories: Category[];
  displayCurrency: string;
  includeHouseholdData: boolean;
}

const DashboardStats = ({ expenses, incomes, displayCurrency, includeHouseholdData }: DashboardStatsProps) => {
  const { convertAmount, formatCurrency } = useCurrencyConverter();

  // Get unique months from all data
  const getUniqueMonths = (data: (Expense | Income)[]) => {
    const months = new Set<string>();
    data.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      months.add(monthKey);
    });
    return months.size;
  };

  // Calculate total expenses - subtract split amounts when not including household data
  const totalExpenses = expenses.reduce((sum, expense) => {
    let expenseAmount = convertAmount(expense.amount, expense.currency, displayCurrency);
    
    // If not including household data and expense has splits, subtract the total split amount
    if (!includeHouseholdData && expense.splits && expense.splits.length > 0) {
      const totalSplitAmount = expense.splits.reduce((splitSum, split) => {
        const splitAmount = split.split_method === 'percentage'
          ? (expenseAmount * split.split_value / 100)
          : convertAmount(split.split_value, expense.currency, displayCurrency);
        return splitSum + splitAmount;
      }, 0);
      expenseAmount -= totalSplitAmount;
    }
    
    return sum + expenseAmount;
  }, 0);
  
  const totalIncomes = incomes.reduce((sum, e) => 
    sum + convertAmount(e.amount, e.currency, displayCurrency), 0);

  // Get number of unique months from combined data
  const allData = [...expenses, ...incomes];
  const uniqueMonthsCount = getUniqueMonths(allData);

  // Calculate averages (avoid division by zero)
  const averageMonthExpenses = uniqueMonthsCount > 0 ? totalExpenses / uniqueMonthsCount : 0;
  const averageMonthIncomes = uniqueMonthsCount > 0 ? totalIncomes / uniqueMonthsCount : 0;

  return (
    <div className="space-y-6 mb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="gradient-income text-white border-0 shadow-mint hover-lift overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-lg font-medium flex items-center gap-2 text-white/90">
              <TrendingUp className="h-5 w-5" />
              Average Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold animate-count-up">
              {formatCurrency(averageMonthIncomes, displayCurrency)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="gradient-expense text-white border-0 shadow-coral hover-lift overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-lg font-medium flex items-center gap-2 text-white/90">
              <TrendingDown className="h-5 w-5" />
              Average Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold animate-count-up">
              {formatCurrency(averageMonthExpenses, displayCurrency)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStats;
