import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ComposedChart, Legend, type TooltipProps } from 'recharts';

type RechartsClickPayload = {
  activePayload?: Array<{ payload?: Record<string, unknown> }>;
};
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useSavingsData } from '@/hooks/useSavingsData';
import { useIncomeData } from '@/hooks/useIncomeData';
import { Category, CategoryGroup, Expense } from '@/interfaces';
import { TrendingUp, PiggyBank, CalendarDays, BarChart3, Layers } from 'lucide-react';

interface DashboardChartsProps {
  expenses: Expense[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
  displayCurrency: string;
  includeHouseholdData: boolean;
}

const DashboardCharts = ({ expenses, categories, categoryGroups, displayCurrency, includeHouseholdData }: DashboardChartsProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<string>('');
  
  const { convertAmount, formatCurrency, getCurrencySymbol } = useCurrencyConverter();
  const { savingsSnapshots, savingsAccounts } = useSavingsData();
  const { incomes } = useIncomeData(includeHouseholdData);

  // Initialize selectedCategoryGroup when categoryGroups loads
  useEffect(() => {
    if (categoryGroups.length > 0 && !selectedCategoryGroup) {
      setSelectedCategoryGroup(categoryGroups[0].id);
    }
  }, [categoryGroups, selectedCategoryGroup]);

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    return months;
  };

  // Calculate monthly spending trend for the past 6 months
  const getMonthlySpendingTrend = () => {
    const monthlyData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const monthValue = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const monthTotal = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getMonth() === date.getMonth() && expenseDate.getFullYear() === date.getFullYear();
      }).reduce((sum, e) => {
        let expenseAmount = convertAmount(e.amount, e.currency, displayCurrency);
        
        // If not including household data and expense has splits, subtract the total split amount
        if (!includeHouseholdData && e.splits && e.splits.length > 0) {
          const totalSplitAmount = e.splits.reduce((splitSum, split) => {
            const splitAmount = split.split_method === 'percentage'
              ? (expenseAmount * split.split_value / 100)
              : convertAmount(split.split_value, e.currency, displayCurrency);
            return splitSum + splitAmount;
          }, 0);
          expenseAmount -= totalSplitAmount;
        }
        
        return sum + expenseAmount;
      }, 0);
      
      // Calculate income for this month
      const monthIncome = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getMonth() === date.getMonth() && incomeDate.getFullYear() === date.getFullYear();
      }).reduce((sum, income) => {
        return sum + convertAmount(income.amount, income.currency, displayCurrency);
      }, 0);
      
      monthlyData.push({
        month: monthName,
        amount: monthTotal,
        income: monthIncome,
        value: monthValue
      });
    }
    
    return monthlyData;
  };

  // Calculate monthly savings trend from savings snapshots
  const getMonthlySavingsTrend = () => {
    const monthlyData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      // Get total savings for this month across all accounts
      const monthSnapshots = savingsSnapshots.filter(s => s.month === month && s.year === year);
      const totalSavings = monthSnapshots.reduce((sum, snapshot) => {
        const account = savingsAccounts.find(acc => acc.id === snapshot.savings_account_id);
        if (!account) return sum;
        
        const balanceInDisplayCurrency = convertAmount(snapshot.balance, account.currency, displayCurrency);
        return sum + balanceInDisplayCurrency;
      }, 0);
      
      monthlyData.push({
        month: monthName,
        amount: totalSavings
      });
    }
    
    return monthlyData;
  };

  // Calculate combined data for monthly expenses vs average by CATEGORY GROUP
  const getCombinedExpensesByGroup = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    const monthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month;
    });

    // Get 6 months ago for average calculation
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return categoryGroups.map(group => {
      // Get all category names in this group
      const groupCategoryNames = group.categories.map(c => c.name);
      
      // Current month total
      const monthlyTotal = monthExpenses
        .filter(e => groupCategoryNames.includes(e.category))
        .reduce((sum, e) => {
          let expenseAmount = convertAmount(e.amount, e.currency, displayCurrency);
          
          if (!includeHouseholdData && e.splits && e.splits.length > 0) {
            const totalSplitAmount = e.splits.reduce((splitSum, split) => {
              const splitAmount = split.split_method === 'percentage'
                ? (expenseAmount * split.split_value / 100)
                : convertAmount(split.split_value, e.currency, displayCurrency);
              return splitSum + splitAmount;
            }, 0);
            expenseAmount -= totalSplitAmount;
          }
          
          return sum + expenseAmount;
        }, 0);

      // Average from past 6 months
      const recentExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= sixMonthsAgo && groupCategoryNames.includes(e.category);
      });
      
      const averageTotal = recentExpenses.reduce((sum, e) => {
        let expenseAmount = convertAmount(e.amount, e.currency, displayCurrency);
        
        if (!includeHouseholdData && e.splits && e.splits.length > 0) {
          const totalSplitAmount = e.splits.reduce((splitSum, split) => {
            const splitAmount = split.split_method === 'percentage'
              ? (expenseAmount * split.split_value / 100)
              : convertAmount(split.split_value, e.currency, displayCurrency);
            return splitSum + splitAmount;
          }, 0);
          expenseAmount -= totalSplitAmount;
        }
        
        return sum + expenseAmount;
      }, 0) / 6;
      
      return {
        name: group.name,
        monthly: monthlyTotal,
        average: averageTotal,
        color: group.color
      };
    }).filter(item => item.monthly > 0 || item.average > 0);
  };

  // Calculate expenses for categories within the selected category group
  const getCategoryExpensesInGroup = () => {
    if (!selectedCategoryGroup) return [];
    
    const group = categoryGroups.find(g => g.id === selectedCategoryGroup);
    if (!group) return [];

    const [year, month] = selectedMonth.split('-').map(Number);
    
    const monthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month;
    });

    // Get 6 months ago for average calculation
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return group.categories.map(category => {
      // Current month total
      const monthlyTotal = monthExpenses
        .filter(e => e.category === category.name)
        .reduce((sum, e) => {
          let expenseAmount = convertAmount(e.amount, e.currency, displayCurrency);
          
          if (!includeHouseholdData && e.splits && e.splits.length > 0) {
            const totalSplitAmount = e.splits.reduce((splitSum, split) => {
              const splitAmount = split.split_method === 'percentage'
                ? (expenseAmount * split.split_value / 100)
                : convertAmount(split.split_value, e.currency, displayCurrency);
              return splitSum + splitAmount;
            }, 0);
            expenseAmount -= totalSplitAmount;
          }
          
          return sum + expenseAmount;
        }, 0);

      // Average from past 6 months
      const recentExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= sixMonthsAgo && e.category === category.name;
      });
      
      const averageTotal = recentExpenses.reduce((sum, e) => {
        let expenseAmount = convertAmount(e.amount, e.currency, displayCurrency);
        
        if (!includeHouseholdData && e.splits && e.splits.length > 0) {
          const totalSplitAmount = e.splits.reduce((splitSum, split) => {
            const splitAmount = split.split_method === 'percentage'
              ? (expenseAmount * split.split_value / 100)
              : convertAmount(split.split_value, e.currency, displayCurrency);
            return splitSum + splitAmount;
          }, 0);
          expenseAmount -= totalSplitAmount;
        }
        
        return sum + expenseAmount;
      }, 0) / 6;

      return {
        name: category.name,
        monthly: monthlyTotal,
        average: averageTotal,
        color: category.color
      };
    }).filter(item => item.monthly > 0 || item.average > 0);
  };

  const spendingTrend = getMonthlySpendingTrend();
  const savingsTrend = getMonthlySavingsTrend();
  const combinedExpensesByGroup = getCombinedExpensesByGroup();
  const categoryExpensesInGroup = getCategoryExpensesInGroup();
  const monthOptions = getMonthOptions();

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border-2 border-border rounded-2xl shadow-soft p-4 z-50">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="font-medium">
              {entry.dataKey === 'monthly' ? 'This Month: ' :
               entry.dataKey === 'average' ? '6-Month Avg: ' :
               entry.dataKey === 'income' ? 'Income: ' :
               entry.dataKey === 'amount' ? 'Expenses: ' : ''}
              {getCurrencySymbol(displayCurrency)}{Number(entry.value ?? 0).toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleSpendingTrendClick = (data: RechartsClickPayload) => {
    const clickedData = data?.activePayload?.[0]?.payload;
    const value = clickedData?.value;
    if (typeof value === 'string') {
      setSelectedMonth(value);
    }
  };

  const PieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border-2 border-border rounded-2xl shadow-soft p-4 z-50">
          <p className="font-semibold text-foreground">{payload[0].name}</p>
          <p className="text-primary font-bold">
            {formatCurrency(Number(payload[0].value ?? 0), displayCurrency)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Chart colors from design system
  const chartColors = {
    expense: '#FF6B6B', // Vibrant Coral
    income: '#00D084', // Neon Mint
    savings: '#9D4EDD', // Bright Purple
    accent: '#FFD60A', // Sunny Yellow
    average: '#A78BFA', // Soft Violet
  };

  return (
    <div className="space-y-10">
      {/* Historical Data Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Historical Data
          <span className="text-sm font-normal text-muted-foreground">(Past 6 Months)</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Spending Trend */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-soft to-background">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Spending & Income Trend
              </CardTitle>
              <CardDescription>Click a bar to view that month's details</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {spendingTrend.some(d => d.amount > 0 || d.income > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={spendingTrend} onClick={handleSpendingTrendClick}>
                    <defs>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.expense} stopOpacity={1}/>
                        <stop offset="100%" stopColor="#FF9F1C" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="amount" 
                      fill="url(#expenseGradient)"
                      radius={[8, 8, 0, 0]}
                      style={{ cursor: 'pointer' }}
                      name="Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke={chartColors.income}
                      strokeWidth={3}
                      name="Income"
                      dot={{ fill: chartColors.income, strokeWidth: 2, r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No spending or income data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Savings Trend */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-soft to-background">
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                Savings Trend
              </CardTitle>
              <CardDescription>Total savings balance over time</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {savingsTrend.some(d => d.amount > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={savingsTrend}>
                    <defs>
                      <linearGradient id="savingsGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={chartColors.savings} stopOpacity={1}/>
                        <stop offset="100%" stopColor="#A78BFA" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="url(#savingsGradient)"
                      strokeWidth={4}
                      dot={{ fill: chartColors.savings, strokeWidth: 2, r: 6, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No savings data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Data Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Monthly Data
          </h2>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48 bg-card border-2 border-border rounded-xl shadow-soft z-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-2 border-border rounded-xl shadow-soft z-50">
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenses by Category Group */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-soft to-background">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Expenses by Category Group
              </CardTitle>
              <CardDescription>
                Monthly expenses vs 6-month average for {monthOptions.find(m => m.value === selectedMonth)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {combinedExpensesByGroup.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={combinedExpensesByGroup}>
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="monthly" 
                      fill={chartColors.expense}
                      radius={[8, 8, 0, 0]}
                      name="This Month"
                    />
                    <Bar 
                      dataKey="average" 
                      fill={chartColors.average}
                      radius={[8, 8, 0, 0]}
                      name="6-Month Avg"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No expenses for selected month</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses in Category Group */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-soft to-background">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Category Breakdown
                  </CardTitle>
                  <CardDescription>
                    Expenses in {monthOptions.find(m => m.value === selectedMonth)?.label}
                  </CardDescription>
                </div>
                <Select value={selectedCategoryGroup} onValueChange={setSelectedCategoryGroup}>
                  <SelectTrigger className="w-40 bg-card border-2 border-border rounded-xl shadow-soft">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-2 border-border rounded-xl shadow-soft z-50">
                    {categoryGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {categoryExpensesInGroup.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryExpensesInGroup}>
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="monthly" 
                      fill={chartColors.expense}
                      radius={[8, 8, 0, 0]}
                      name="This Month"
                    />
                    <Bar 
                      dataKey="average" 
                      fill={chartColors.average}
                      radius={[8, 8, 0, 0]}
                      name="6-Month Avg"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {selectedCategoryGroup ? 'No expenses in this category group' : 'Select a category group'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Savings Summary by Account */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-soft to-background">
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                Savings Summary
              </CardTitle>
              <CardDescription>
                Balance for {monthOptions.find(m => m.value === selectedMonth)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {savingsAccounts.length > 0 ? (
                <div className="space-y-4">
                  {savingsAccounts.map((account) => {
                    // Get snapshot for the selected month
                    const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
                    const monthSnapshot = savingsSnapshots.find(s => 
                      s.savings_account_id === account.id && 
                      s.month === selectedMonthNum && 
                      s.year === selectedYear
                    );
                    
                    const currentBalance = monthSnapshot ? monthSnapshot.balance : 0;
                    const balanceInDisplayCurrency = convertAmount(currentBalance, account.currency, displayCurrency);
                    
                    return (
                      <div key={account.id} className="p-4 bg-pink-soft rounded-xl hover:bg-pink-light transition-colors">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{account.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {account.account_type.replace('_', ' ').toUpperCase()}
                            </p>
                            {account.holding_type === 'stock' && account.stock_symbol && (
                              <p className="text-xs text-muted-foreground">
                                {account.stock_symbol} - {account.stock_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-purple">
                              {formatCurrency(balanceInDisplayCurrency, displayCurrency)}
                            </p>
                            {!monthSnapshot && (
                              <p className="text-xs text-muted-foreground">
                                No data for this month
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t-2 border-border">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">Total Savings</span>
                      <span className="font-bold text-xl text-purple">
                        {formatCurrency(
                          savingsAccounts.reduce((total, account) => {
                            const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
                            const monthSnapshot = savingsSnapshots.find(s => 
                              s.savings_account_id === account.id && 
                              s.month === selectedMonthNum && 
                              s.year === selectedYear
                            );
                            const currentBalance = monthSnapshot ? monthSnapshot.balance : 0;
                            return total + convertAmount(currentBalance, account.currency, displayCurrency);
                          }, 0),
                          displayCurrency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">🐷</span>
                  <p className="text-muted-foreground">No savings accounts yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;