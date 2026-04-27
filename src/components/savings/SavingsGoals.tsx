import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, PiggyBank, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useSavingsData } from '@/hooks/useSavingsData';
import { format } from 'date-fns';
import AddSavingsAccountDialog from './AddSavingsAccountDialog';
import UpdateBalanceDialog from './UpdateBalanceDialog';
import EditSavingsAccountDialog from './EditSavingsAccountDialog';
interface SavingsGoalsProps {
  displayCurrency?: string;
  includeHouseholdData?: boolean;
}
const SavingsGoals = ({
  displayCurrency = 'USD',
  includeHouseholdData = false
}: SavingsGoalsProps) => {
  const {
    getCurrencySymbol,
    convertAmount
  } = useCurrencyConverter();
  const {
    savingsAccounts,
    savingsSnapshots,
    loading,
    getSnapshotForAccountAndMonth,
    deleteSavingsAccount,
    refetch
  } = useSavingsData(includeHouseholdData);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;
    
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        newMonth = 12;
        newYear = selectedYear - 1;
      } else {
        newMonth = selectedMonth - 1;
      }
    } else {
      if (selectedMonth === 12) {
        newMonth = 1;
        newYear = selectedYear + 1;
      } else {
        newMonth = selectedMonth + 1;
      }
    }

    // Don't allow navigation to future months
    const isNewMonthFuture = newYear > currentDate.getFullYear() || 
      (newYear === currentDate.getFullYear() && newMonth > currentDate.getMonth() + 1);
    
    if (!isNewMonthFuture) {
      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
    }
  };
  const formatAmount = (amount: number, currency: string) => {
    const convertedAmount = convertAmount(amount, currency, displayCurrency);
    return `${getCurrencySymbol(displayCurrency)}${convertedAmount.toLocaleString()}`;
  };
  const getAccountBalance = (accountId: string) => {
    const snapshot = getSnapshotForAccountAndMonth(accountId, selectedMonth, selectedYear);
    return snapshot?.balance || 0;
  };
  const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1;
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading savings data...</div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Month Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">
                {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')}
              </h3>
              {isCurrentMonth && <span className="text-sm text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                  Current Month
                </span>}
            </div>

            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Savings Accounts</h2>
        <AddSavingsAccountDialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </AddSavingsAccountDialog>
      </div>

      {savingsAccounts.length === 0 ? <Card>
          <CardContent className="p-8 text-center">
            <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Savings Accounts Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your savings by creating your first savings account.
            </p>
            <AddSavingsAccountDialog>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Account
              </Button>
            </AddSavingsAccountDialog>
          </CardContent>
        </Card> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savingsAccounts.map(account => {
        const balance = getAccountBalance(account.id);
        const snapshot = getSnapshotForAccountAndMonth(account.id, selectedMonth, selectedYear);
        return <Card key={account.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{account.name}</span>
                    <div className="flex items-center gap-2">
                      
                      {account.holding_type === 'stock' && <span className="text-xs bg-primary/10 px-2 py-1 rounded">
                          {account.stock_symbol}
                        </span>}
                      <EditSavingsAccountDialog account={account} onUpdate={refetch}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </EditSavingsAccountDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Savings Account</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{account.name}"? This action cannot be undone and will remove all associated balance history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSavingsAccount(account.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {account.holding_type === 'stock' ? 'Portfolio Value' : 'Balance'}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatAmount(balance, account.currency)}
                    </p>
                    {account.holding_type === 'stock' && snapshot && <div className="text-xs text-muted-foreground mt-1">
                        {snapshot.stock_quantity} shares × {account.currency}{snapshot.stock_price_per_share?.toFixed(2)}
                      </div>}
                  </div>

                  <div className="flex-1">
                    {account.description && <p className="text-sm text-muted-foreground">{account.description}</p>}
                  </div>

                  <UpdateBalanceDialog account={account} month={selectedMonth} year={selectedYear} currentBalance={balance} currentStockQuantity={snapshot?.stock_quantity || 0} currentStockPrice={snapshot?.stock_price_per_share || 0} onUpdate={refetch}>
                    <Button variant="outline" size="sm" className="w-full">
                      Update Balance
                    </Button>
                  </UpdateBalanceDialog>
                </CardContent>
              </Card>;
      })}
        </div>}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total Savings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Total for {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')}
            </p>
            <p className="text-3xl font-bold">
              {formatAmount(savingsAccounts.reduce((total, account) => {
              const balance = getAccountBalance(account.id);
              return total + convertAmount(balance, account.currency, displayCurrency);
            }, 0), displayCurrency)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default SavingsGoals;