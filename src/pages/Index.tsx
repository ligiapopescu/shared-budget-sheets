
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ExpenseList from '@/components/ExpenseList';
import IncomeList from '@/components/IncomeList';
import SpendingSummary from '@/components/SpendingSummary';
import FileUpload from '@/components/FileUpload';
import AppHeader from '@/components/AppHeader';
import AppNavigation from '@/components/AppNavigation';
import DashboardStats from '@/components/DashboardStats';
import DashboardCharts from '@/components/DashboardCharts';
import FixedExpenses from '@/components/FixedExpenses';
import SavingsGoals from '@/components/SavingsGoals';
import DebtTracker from '@/components/DebtTracker';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useIncomeData } from '@/hooks/useIncomeData';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { useHouseholdStatus } from '@/hooks/useHouseholdStatus';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [includeHouseholdData, setIncludeHouseholdData] = useState(false);
  const { displayCurrency, setDisplayCurrency, loading: currencyLoading } = useCurrencyPreference();
  const { expenses, categories, categoryGroups, loading: expensesLoading, addExpense, deleteExpense, updateExpense, removeSplitFromExpense, refreshData, getMerchantCategory } = useExpenseData(includeHouseholdData);
  const { incomes, loading: incomesLoading, addIncome, deleteIncome, updateIncome } = useIncomeData(includeHouseholdData);
  const { isInHousehold, loading: householdStatusLoading } = useHouseholdStatus();

  const loading = expensesLoading || incomesLoading || currencyLoading || householdStatusLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg font-medium text-foreground animate-pulse-soft flex items-center gap-3">
          <span className="text-2xl">💰</span>
          Loading your data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <AppHeader 
          displayCurrency={displayCurrency} 
          onCurrencyChange={setDisplayCurrency}
          includeHouseholdData={includeHouseholdData}
          onToggleHouseholdData={setIncludeHouseholdData}
          showHouseholdToggle={isInHousehold}
        />
        
        <div className="mb-8">
          <AppNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Dashboard Stats */}
        {activeTab === 'dashboard' && (
          <DashboardStats 
            expenses={expenses} 
            incomes={incomes}
            categories={categories} 
            displayCurrency={displayCurrency}
            includeHouseholdData={includeHouseholdData}
          />
        )}

        {/* Content Area */}
        <Card className="backdrop-blur-sm bg-card/95 shadow-soft border-0">
          <CardContent className="p-8">
            {activeTab === 'dashboard' && (
              <div className="space-y-10">
                <DashboardCharts
                  expenses={expenses}
                  categories={categories}
                  categoryGroups={categoryGroups}
                  displayCurrency={displayCurrency}
                  includeHouseholdData={includeHouseholdData}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <SpendingSummary 
                    expenses={expenses} 
                    categories={categories}
                    displayCurrency={displayCurrency}
                  />
                  <FixedExpenses
                    expenses={expenses}
                    displayCurrency={displayCurrency}
                    includeHouseholdData={includeHouseholdData}
                  />
                </div>
              </div>
            )}
            
            {activeTab === 'income' && (
              <IncomeList 
                incomes={incomes}
                onDeleteIncome={deleteIncome}
                onUpdateIncome={updateIncome}
                onAddIncome={addIncome}
                displayCurrency={displayCurrency}
              />
            )}

            {activeTab === 'savings' && (
              <SavingsGoals 
                displayCurrency={displayCurrency}
                includeHouseholdData={includeHouseholdData}
              />
            )}

            {activeTab === 'debt' && (
              <DebtTracker 
                displayCurrency={displayCurrency}
              />
            )}
            
            {activeTab === 'upload' && (
              <FileUpload 
                categories={categories}
                categoryGroups={categoryGroups}
                getMerchantCategory={getMerchantCategory}
                onUploadExpenses={async (fileExpenses) => {
                  for (const expense of fileExpenses) {
                    await addExpense(expense);
                  }
                }}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpenseList 
                expenses={expenses} 
                categories={categories}
                categoryGroups={categoryGroups}
                onDeleteExpense={deleteExpense}
                onUpdateExpense={updateExpense}
                onAddExpense={addExpense}
                displayCurrency={displayCurrency}
                onUploadClick={() => setActiveTab('upload')}
                removeSplitFromExpense={removeSplitFromExpense}
                refreshData={refreshData}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
