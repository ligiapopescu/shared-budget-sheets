
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Expense } from '@/interfaces';
import { HouseholdPerson } from '@/interfaces/debt';

interface BulkSplitExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedExpenses: Expense[];
  householdPersons: HouseholdPerson[];
  onBulkSplit: (splitData: {
    household_person_id: string;
    splitType: 'amount' | 'percentage';
    splitValue: number;
  }) => void;
  displayCurrency: string;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => number;
}

const BulkSplitExpenseDialog = ({ 
  open, 
  onOpenChange, 
  selectedExpenses, 
  householdPersons, 
  onBulkSplit,
  displayCurrency,
  convertAmount
}: BulkSplitExpenseDialogProps) => {
  const [selectedPerson, setSelectedPerson] = useState('');
  const [splitType, setSplitType] = useState<'amount' | 'percentage'>('percentage');
  const [splitValue, setSplitValue] = useState('50');
  const { toast } = useToast();

  const totalAmount = selectedExpenses.reduce((sum, expense) => {
    return sum + convertAmount(expense.amount, expense.currency, displayCurrency);
  }, 0);

  const calculateTotalSplitAmount = () => {
    if (!splitValue) return 0;
    
    const value = parseFloat(splitValue);
    if (isNaN(value)) return 0;
    
    if (splitType === 'percentage') {
      return (totalAmount * value) / 100;
    }
    
    return value * selectedExpenses.length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPerson || !splitValue) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const value = parseFloat(splitValue);
    if (isNaN(value) || value <= 0) {
      toast({
        title: "Error",
        description: "Split value must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (splitType === 'percentage' && value > 100) {
      toast({
        title: "Error",
        description: "Percentage cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }

    const selectedPersonName = householdPersons.find(p => p.id === selectedPerson)?.name || '';
    
    onBulkSplit({
      household_person_id: selectedPerson,
      splitType,
      splitValue: value,
    });

    setSelectedPerson('');
    setSplitType('percentage');
    setSplitValue('50');
    onOpenChange(false);
    
    toast({
      title: "Success",
      description: `${selectedExpenses.length} expenses split with ${selectedPersonName}`,
    });
  };

  if (selectedExpenses.length === 0) return null;

  if (householdPersons.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Split Expenses</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">
              You need to add household members first before splitting expenses.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const totalSplitAmount = calculateTotalSplitAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Split Expenses</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Selected Expenses ({selectedExpenses.length})</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedExpenses.map((expense) => (
              <div key={expense.id} className="text-sm text-gray-600 flex justify-between">
                <span>{expense.merchant} • {new Date(expense.date).toLocaleDateString()}</span>
                <span>{expense.currency} {expense.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="font-medium">
              Total: {displayCurrency} {totalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Split with</Label>
            <Select value={selectedPerson} onValueChange={setSelectedPerson}>
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {householdPersons.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Split by</Label>
            <RadioGroup value={splitType} onValueChange={(value: 'amount' | 'percentage') => setSplitType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage">Percentage (same % for each expense)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="amount" id="amount" />
                <Label htmlFor="amount">Fixed Amount (same amount for each expense)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="splitValue">
              {splitType === 'amount' ? `Amount per expense (${displayCurrency})` : 'Percentage (%)'}
            </Label>
            <Input
              id="splitValue"
              type="number"
              step={splitType === 'amount' ? '0.01' : '1'}
              max={splitType === 'percentage' ? '100' : undefined}
              value={splitValue}
              onChange={(e) => setSplitValue(e.target.value)}
              placeholder={splitType === 'amount' ? '0.00' : '50'}
            />
          </div>

          {splitValue && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm">
                <strong>Total Split Amount:</strong> {displayCurrency} {totalSplitAmount.toFixed(2)}
              </p>
              {splitType === 'amount' && (
                <p className="text-xs text-gray-600 mt-1">
                  {displayCurrency} {parseFloat(splitValue || '0').toFixed(2)} per expense × {selectedExpenses.length} expenses
                </p>
              )}
              {splitType === 'percentage' && (
                <p className="text-xs text-gray-600 mt-1">
                  {splitValue}% of each expense amount
                </p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                These amounts will be added as debt entries (they owe you)
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Split All Expenses</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkSplitExpenseDialog;
