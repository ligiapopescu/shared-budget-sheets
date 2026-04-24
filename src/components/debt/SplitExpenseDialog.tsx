
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

interface SplitExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  householdPersons: HouseholdPerson[];
  existingSplitCount?: number;
  onSplitExpense: (splitData: {
    household_person_id: string;
    splitType: 'amount' | 'percentage';
    splitValue: number;
    description: string;
  }) => void;
}

const SplitExpenseDialog = ({ open, onOpenChange, expense, householdPersons, existingSplitCount, onSplitExpense }: SplitExpenseDialogProps) => {
  const [selectedPerson, setSelectedPerson] = useState('');
  const [splitType, setSplitType] = useState<'amount' | 'percentage'>('amount');
  const [splitValue, setSplitValue] = useState('');
  const { toast } = useToast();

  const calculateSplitAmount = () => {
    if (!expense || !splitValue) return 0;
    
    const value = parseFloat(splitValue);
    if (isNaN(value)) return 0;
    
    if (splitType === 'percentage') {
      return (expense.amount * value) / 100;
    }
    
    return value;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPerson || !splitValue || !expense) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const splitAmount = calculateSplitAmount();
    
    if (splitAmount <= 0) {
      toast({
        title: "Error",
        description: "Split amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (splitAmount > expense.amount) {
      toast({
        title: "Error",
        description: "Split amount cannot exceed the expense amount",
        variant: "destructive",
      });
      return;
    }

    const selectedPersonName = householdPersons.find(p => p.id === selectedPerson)?.name || '';
    
    onSplitExpense({
      household_person_id: selectedPerson,
      splitType,
      splitValue: parseFloat(splitValue),
      description: `Split from expense: ${expense.merchant} (${expense.date})`,
    });

    setSelectedPerson('');
    setSplitType('amount');
    setSplitValue('');
    onOpenChange(false);
    
    toast({
      title: "Success",
      description: `Expense split with ${selectedPersonName}`,
    });
  };

  if (!expense) return null;

  if (householdPersons.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split Expense</DialogTitle>
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

  const splitAmount = calculateSplitAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Split Expense</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium">Expense Details</h4>
          <p className="text-sm text-gray-600">
            {expense.merchant} • {new Date(expense.date).toLocaleDateString()} • {expense.currency} {expense.amount.toFixed(2)}
          </p>
        </div>

        {existingSplitCount && existingSplitCount > 0 && (
          <div className="mb-4 p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 text-sm">
            This expense already has {existingSplitCount} split{existingSplitCount > 1 ? 's' : ''}. New splits will be linked to the original.
          </div>
        )}

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
                <RadioGroupItem value="amount" id="amount" />
                <Label htmlFor="amount">Fixed Amount</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage">Percentage</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="splitValue">
              {splitType === 'amount' ? `Amount (${expense.currency})` : 'Percentage (%)'}
            </Label>
            <Input
              id="splitValue"
              type="number"
              step={splitType === 'amount' ? '0.01' : '1'}
              max={splitType === 'percentage' ? '100' : expense.amount.toString()}
              value={splitValue}
              onChange={(e) => setSplitValue(e.target.value)}
              placeholder={splitType === 'amount' ? '0.00' : '50'}
            />
          </div>

          {splitValue && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm">
                <strong>Split Amount:</strong> {expense.currency} {splitAmount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                This amount will be added as a debt entry (they owe you)
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Split Expense</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SplitExpenseDialog;
