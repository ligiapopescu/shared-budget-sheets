
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useHouseholdData } from '@/hooks/useHouseholdData';
import { Category, CategoryGroup, Expense, ExpenseSplit } from '@/interfaces';
import DatePickerInput from '@/components/DatePickerInput';
import ExpenseMultiSplitManager from '@/components/expense/ExpenseMultiSplitManager';
import CategorySelect from '@/components/CategorySelect';
import { CurrencySelectItems } from '@/components/CurrencySelectItems';

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, 'id' | 'user_id'>) => void;
  categories: Category[];
  categoryGroups?: CategoryGroup[];
  expenses: Expense[];
}

const ExpenseForm = ({ onAddExpense, categories, categoryGroups, expenses }: ExpenseFormProps) => {
  const { getMerchantCategory } = useExpenseData();
  const { householdPersons } = useHouseholdData();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    amount: '',
    category: '',
    description: '',
    currency: 'USD',
  });
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const { toast } = useToast();

  // Auto-fill category based on merchant
  useEffect(() => {
    if (formData.merchant) {
      const merchantCategory = getMerchantCategory(formData.merchant);
      if (merchantCategory && merchantCategory !== 'Other') {
        setFormData(prev => ({ ...prev, category: merchantCategory }));
      }
    }
  }, [formData.merchant, getMerchantCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.merchant || !formData.amount || !formData.category || !formData.currency) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    onAddExpense({
      date: formData.date,
      merchant: formData.merchant,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description || undefined,
      currency: formData.currency,
      splits: splits.length > 0 ? splits : undefined,
    });

    setFormData({
      date: new Date().toISOString().split('T')[0],
      merchant: '',
      amount: '',
      category: '',
      description: '',
      currency: 'USD',
    });
    setSplits([]);

    toast({
      title: "Expense Added",
      description: "Your expense has been successfully recorded",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Expense</CardTitle>
        <CardDescription>Enter your expense details below</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
<DatePickerInput
  id="date"
  value={formData.date}
  onChange={(val) => setFormData(prev => ({ ...prev, date: val }))}
  required
/>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <CurrencySelectItems withSymbol />
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="merchant">Merchant</Label>
              <Input
                id="merchant"
                placeholder="Store or service name"
                value={formData.merchant}
                onChange={(e) => setFormData(prev => ({ ...prev, merchant: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelect
              categories={categories}
              categoryGroups={categoryGroups}
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              placeholder="Select a category"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional notes about this expense..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {householdPersons.length > 0 && formData.amount && (
            <div className="pt-4 border-t">
              <ExpenseMultiSplitManager
                householdPersons={householdPersons}
                expenseAmount={parseFloat(formData.amount) || 0}
                expenseCurrency={formData.currency}
                splits={splits}
                onSplitsChange={setSplits}
              />
            </div>
          )}
          
          <Button type="submit" className="w-full">
            Add Expense
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;
