import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { Expense } from '@/interfaces';
import { CalendarClock } from 'lucide-react';

interface FixedExpensesProps {
  expenses: Expense[];
  displayCurrency: string;
  includeHouseholdData: boolean;
  minConsecutiveMonths?: number;
}

interface RecurringMerchant {
  merchant: string;
  averageAmount: number;
  currency: string;
}

const FixedExpenses = ({ expenses, displayCurrency, includeHouseholdData, minConsecutiveMonths = 3 }: FixedExpensesProps) => {
  const { convertAmount, formatCurrency } = useCurrencyConverter();

  const recurringMerchants = useMemo(() => {
    // Get the last N complete months (excluding current month)
    const now = new Date();
    const recentMonths: string[] = [];
    for (let i = 1; i <= minConsecutiveMonths; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      recentMonths.push(monthKey);
    }

    // Group expenses by merchant (case-insensitive)
    const merchantData: Record<string, { 
      amounts: number[]; 
      months: Set<string>;
      originalMerchant: string;
    }> = {};

    expenses.forEach(expense => {
      // Apply household data filter - subtract splits when not including household data
      let amountInDisplayCurrency = convertAmount(expense.amount, expense.currency, displayCurrency);
      
      if (!includeHouseholdData && expense.splits && expense.splits.length > 0) {
        const totalSplitAmount = expense.splits.reduce((splitSum, split) => {
          const splitAmount = split.split_method === 'percentage'
            ? (amountInDisplayCurrency * split.split_value / 100)
            : convertAmount(split.split_value, expense.currency, displayCurrency);
          return splitSum + splitAmount;
        }, 0);
        amountInDisplayCurrency -= totalSplitAmount;
      }

      const merchantKey = expense.merchant.toLowerCase().trim();
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!merchantData[merchantKey]) {
        merchantData[merchantKey] = {
          amounts: [],
          months: new Set(),
          originalMerchant: expense.merchant
        };
      }

      merchantData[merchantKey].amounts.push(amountInDisplayCurrency);
      merchantData[merchantKey].months.add(monthKey);
    });

    // Filter for merchants present in ALL of the last N consecutive months
    const recurring: RecurringMerchant[] = [];

    Object.entries(merchantData).forEach(([, data]) => {
      // Check if merchant is present in all recent months
      const presentInAllRecentMonths = recentMonths.every(month => data.months.has(month));
      
      if (presentInAllRecentMonths) {
        // Calculate average from only the recent months' data
        const recentAmounts = expenses
          .filter(exp => {
            const expMonthKey = `${new Date(exp.date).getFullYear()}-${String(new Date(exp.date).getMonth() + 1).padStart(2, '0')}`;
            return exp.merchant.toLowerCase().trim() === data.originalMerchant.toLowerCase().trim() 
              && recentMonths.includes(expMonthKey);
          })
          .map(exp => {
            let amt = convertAmount(exp.amount, exp.currency, displayCurrency);
            if (!includeHouseholdData && exp.splits && exp.splits.length > 0) {
              const totalSplitAmount = exp.splits.reduce((splitSum, split) => {
                const splitAmount = split.split_method === 'percentage'
                  ? (amt * split.split_value / 100)
                  : convertAmount(split.split_value, exp.currency, displayCurrency);
                return splitSum + splitAmount;
              }, 0);
              amt -= totalSplitAmount;
            }
            return amt;
          });

        const averageAmount = recentAmounts.reduce((sum, amt) => sum + amt, 0) / minConsecutiveMonths;
        
        recurring.push({
          merchant: data.originalMerchant,
          averageAmount,
          currency: displayCurrency
        });
      }
    });

    // Sort by average amount descending
    return recurring.sort((a, b) => b.averageAmount - a.averageAmount);
  }, [expenses, displayCurrency, includeHouseholdData, minConsecutiveMonths, convertAmount]);

  if (recurringMerchants.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2 bg-gradient-to-r from-pink-soft to-background rounded-t-2xl">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Fixed Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🔄</span>
            <p className="text-sm text-muted-foreground">
              No recurring expenses detected in the last {minConsecutiveMonths} months.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalFixedExpenses = recurringMerchants.reduce((sum, m) => sum + m.averageAmount, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 bg-gradient-to-r from-pink-soft to-background rounded-t-2xl">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Fixed Expenses
          <span className="text-sm font-semibold text-coral ml-auto bg-coral/10 px-3 py-1 rounded-full">
            {formatCurrency(totalFixedExpenses, displayCurrency)}/mo
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        <ScrollArea className="h-[200px] px-6 pb-4">
          <div className="space-y-2">
            {recurringMerchants.map((merchant, index) => (
              <div 
                key={`${merchant.merchant}-${index}`}
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-pink-soft hover:bg-pink-light transition-all duration-200 hover:shadow-soft"
              >
                <span className="text-sm font-medium truncate flex-1 min-w-0">
                  {merchant.merchant}
                </span>
                <span className="text-sm font-bold text-coral ml-4 whitespace-nowrap">
                  {formatCurrency(merchant.averageAmount, merchant.currency)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default FixedExpenses;
