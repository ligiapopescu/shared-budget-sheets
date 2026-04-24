
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Edit2, Trash2, Save, X, Split } from 'lucide-react';
import { Expense, Category } from '@/interfaces';
import SplitExpenseDialog from '@/components/debt/SplitExpenseDialog';
import DatePickerInput from '@/components/DatePickerInput';

import { useHouseholdData } from '@/hooks/useHouseholdData';

interface ExpenseItemProps {
  expense: Expense;
  categories: Category[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, expense: Partial<Expense>) => void;
  displayCurrency: string;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => number;
  isNew?: boolean;
  onSaveNew?: (expenseData: Omit<Expense, 'id' | 'user_id'>) => Promise<void>;
  onCancelNew?: () => void;
}

const ExpenseItem = ({ 
  expense, 
  categories, 
  onDelete, 
  onUpdate, 
  displayCurrency, 
  convertAmount, 
  isNew = false,
  onSaveNew,
  onCancelNew
}: ExpenseItemProps) => {
  const [isEditing, setIsEditing] = useState(isNew);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [editData, setEditData] = useState({
    date: expense.date,
    merchant: expense.merchant,
    amount: expense.amount.toString(),
    category: expense.category,
    description: expense.description || '',
    currency: expense.currency,
  });

  const { householdPersons, debtEntries, addDebtEntry } = useHouseholdData();

  const handleSave = async () => {
    const updatedExpense = {
      ...editData,
      amount: parseFloat(editData.amount),
    };
    
    if (isNew && onSaveNew) {
      await onSaveNew(updatedExpense);
    } else {
      onUpdate(expense.id, updatedExpense);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (isNew && onCancelNew) {
      onCancelNew();
      return;
    }
    
    setEditData({
      date: expense.date,
      merchant: expense.merchant,
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description || '',
      currency: expense.currency,
    });
    setIsEditing(false);
  };

  const handleSplitExpense = (splitData: { household_person_id: string; splitType: 'amount' | 'percentage'; splitValue: number; description: string }) => {
    const value = splitData.splitValue;
    const amountToSplit = splitData.splitType === 'percentage'
      ? parseFloat(((expense.amount * value) / 100).toFixed(2))
      : value;

    addDebtEntry({
      household_person_id: splitData.household_person_id,
      amount: amountToSplit,
      currency: expense.currency,
      description: splitData.description,
      date: expense.date,
      type: 'owe_me',
      expense_id: expense.id,
      split_method: splitData.splitType,
      split_value: splitData.splitType === 'percentage' ? value : amountToSplit,
      resolved: false,
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const convertedAmount = convertAmount(amount, currency, displayCurrency);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(convertedAmount);
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6b7280';
  };

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
<DatePickerInput
            value={editData.date}
            onChange={(val) => setEditData({ ...editData, date: val })}
          />
          
          <Input
            value={editData.merchant}
            onChange={(e) => setEditData({ ...editData, merchant: e.target.value })}
            placeholder="Merchant"
          />
          
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={editData.amount}
              onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
              placeholder="Amount"
              className="flex-1"
            />
            <Select
              value={editData.currency}
              onValueChange={(value) => setEditData({ ...editData, currency: value })}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="RON">RON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select
            value={editData.category}
            onValueChange={(value) => setEditData({ ...editData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Description (optional)"
          />
          
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
          <div className="text-sm text-gray-600">
            {new Date(expense.date).toLocaleDateString()}
          </div>
          
          <div className="font-medium">
            {expense.merchant}
          </div>
          
          <div className="font-semibold">
            {formatCurrency(expense.amount, expense.currency)}
            {expense.currency !== displayCurrency && (
              <div className="text-xs text-gray-500">
                {expense.currency} {expense.amount.toFixed(2)}
              </div>
            )}
          </div>
          
          <Badge 
            variant="secondary" 
            style={{ backgroundColor: getCategoryColor(expense.category) + '20', color: getCategoryColor(expense.category) }}
          >
            {expense.category}
          </Badge>
          
          <div className="text-sm">
            {expense.splits && expense.splits.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Split with:</div>
                {expense.splits.map((split, index) => (
                  <Badge key={index} variant="secondary" className="text-xs mr-1">
                    {split.household_person_name} ({split.split_method === 'percentage' ? `${split.split_value}%` : `${expense.currency} ${split.split_value.toFixed(2)}`})
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-gray-600 truncate">{expense.description || '—'}</span>
            )}
          </div>
          
          <div className="flex gap-2 justify-end">
            {!isNew && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowSplitDialog(true)}
                disabled={householdPersons.length === 0}
                title={householdPersons.length === 0 ? "Add household members to split expenses" : "Split this expense"}
              >
                <Split className="w-4 h-4" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this expense? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(expense.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {!isNew && (
        <SplitExpenseDialog
          open={showSplitDialog}
          onOpenChange={setShowSplitDialog}
          expense={expense}
          householdPersons={householdPersons}
          existingSplitCount={(debtEntries || []).filter(d => d.expense_id === expense.id).length}
          onSplitExpense={handleSplitExpense}
        />
      )}
    </>
  );
};

export default ExpenseItem;
