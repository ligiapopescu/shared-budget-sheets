
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HouseholdPerson } from '@/interfaces/debt';
import { ExpenseSplit } from '@/interfaces';
import { toast } from 'sonner';

interface PendingExpense {
  tempId: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  currency: string;
  description?: string;
  splits?: ExpenseSplit[];
}

interface BulkSplitPendingExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedExpenses: PendingExpense[];
  householdPersons: HouseholdPerson[];
  onBulkSplit: (splits: ExpenseSplit[]) => void;
}

const BulkSplitPendingExpenseDialog = ({
  open,
  onOpenChange,
  selectedExpenses,
  householdPersons,
  onBulkSplit,
}: BulkSplitPendingExpenseDialogProps) => {
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [splitType, setSplitType] = useState<'amount' | 'percentage'>('percentage');
  const [splitValue, setSplitValue] = useState<string>('50');

  const handleSubmit = () => {
    if (!selectedPerson) {
      toast.error('Please select a person to split with');
      return;
    }

    const numValue = parseFloat(splitValue);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Please enter a valid split value');
      return;
    }

    if (splitType === 'percentage' && numValue > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    const person = householdPersons.find(p => p.id === selectedPerson);
    if (!person) {
      toast.error('Selected person not found');
      return;
    }

    const splits: ExpenseSplit[] = [{
      household_person_id: selectedPerson,
      household_person_name: person.name,
      split_method: splitType,
      split_value: numValue,
    }];

    onBulkSplit(splits);
    toast.success(`Split applied to ${selectedExpenses.length} expense(s)`);
    
    // Reset form
    setSelectedPerson('');
    setSplitType('percentage');
    setSplitValue('50');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPerson('');
      setSplitType('percentage');
      setSplitValue('50');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Split Expenses</DialogTitle>
          <DialogDescription>
            Apply the same split to {selectedExpenses.length} selected expense{selectedExpenses.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Split with</Label>
            <Select value={selectedPerson} onValueChange={setSelectedPerson}>
              <SelectTrigger>
                <SelectValue placeholder="Select a person" />
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

          <div className="space-y-2">
            <Label>Split type</Label>
            <RadioGroup
              value={splitType}
              onValueChange={(value) => setSplitType(value as 'amount' | 'percentage')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="cursor-pointer">Percentage</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="amount" id="amount" />
                <Label htmlFor="amount" className="cursor-pointer">Fixed Amount</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>{splitType === 'percentage' ? 'Percentage' : 'Amount'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={splitValue}
                onChange={(e) => setSplitValue(e.target.value)}
                placeholder={splitType === 'percentage' ? '50' : '10.00'}
                min="0"
                max={splitType === 'percentage' ? '100' : undefined}
                step={splitType === 'percentage' ? '1' : '0.01'}
              />
              <span className="text-muted-foreground">
                {splitType === 'percentage' ? '%' : '(per expense)'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedPerson}>
            Apply Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkSplitPendingExpenseDialog;
