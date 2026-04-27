import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, X, DollarSign, Percent } from 'lucide-react';
import { ExpenseSplit } from '@/interfaces';
import { HouseholdPerson } from '@/interfaces/debt';

interface ExpenseMultiSplitManagerProps {
  householdPersons: HouseholdPerson[];
  expenseAmount: number;
  expenseCurrency: string;
  splits: ExpenseSplit[];
  onSplitsChange: (splits: ExpenseSplit[]) => void;
}

const ExpenseMultiSplitManager = ({
  householdPersons,
  expenseAmount,
  expenseCurrency,
  splits,
  onSplitsChange,
}: ExpenseMultiSplitManagerProps) => {
  const [newSplit, setNewSplit] = useState<Partial<ExpenseSplit>>({
    split_method: 'percentage',
    split_value: 50,
  });

  const addSplit = () => {
    if (!newSplit.household_person_id || !newSplit.split_value) return;

    const person = householdPersons.find(p => p.id === newSplit.household_person_id);
    if (!person) return;

    const split: ExpenseSplit = {
      household_person_id: newSplit.household_person_id,
      household_person_name: person.name,
      split_method: newSplit.split_method as 'amount' | 'percentage',
      split_value: newSplit.split_value,
    };

    onSplitsChange([...splits, split]);
    
    // Reset form
    setNewSplit({
      split_method: 'percentage',
      split_value: 50,
    });
  };

  const removeSplit = (index: number) => {
    onSplitsChange(splits.filter((_, i) => i !== index));
  };

  const calculateTotalSplit = () => {
    return splits.reduce((total, split) => {
      if (split.split_method === 'percentage') {
        return total + split.split_value;
      } else {
        return total + split.split_value;
      }
    }, 0);
  };

  const calculateSplitAmount = (split: ExpenseSplit) => {
    if (split.split_method === 'percentage') {
      return (expenseAmount * split.split_value / 100).toFixed(2);
    }
    return split.split_value.toFixed(2);
  };

  const totalPercentage = splits
    .filter(s => s.split_method === 'percentage')
    .reduce((sum, s) => sum + s.split_value, 0);
  
  const totalAmount = splits
    .filter(s => s.split_method === 'amount')
    .reduce((sum, s) => sum + s.split_value, 0);

  const availablePersons = householdPersons.filter(
    p => !splits.some(s => s.household_person_id === p.id)
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Split with Multiple People</h4>
        
        {splits.length > 0 && (
          <div className="space-y-2">
            {splits.map((split, index) => (
              <Card key={index} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline">{split.household_person_name}</Badge>
                  <div className="flex items-center gap-2 text-sm">
                    {split.split_method === 'percentage' ? (
                      <>
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">{split.split_value}%</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">{expenseCurrency} {split.split_value.toFixed(2)}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">
                      = {expenseCurrency} {calculateSplitAmount(split)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSplit(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </Card>
            ))}
            
            <div className="text-xs text-muted-foreground">
              {totalPercentage > 0 && (
                <div>Total percentage: {totalPercentage}% {totalPercentage > 100 && <span className="text-destructive">(exceeds 100%)</span>}</div>
              )}
              {totalAmount > 0 && (
                <div>Total amount: {expenseCurrency} {totalAmount.toFixed(2)} {totalAmount > expenseAmount && <span className="text-destructive">(exceeds expense amount)</span>}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {availablePersons.length > 0 && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium">Person</label>
            <Select
              value={newSplit.household_person_id || ''}
              onValueChange={(value) => setNewSplit({ ...newSplit, household_person_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {availablePersons.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-32 space-y-2">
            <label className="text-xs font-medium">Method</label>
            <Select
              value={newSplit.split_method}
              onValueChange={(value: 'amount' | 'percentage') => 
                setNewSplit({ 
                  ...newSplit, 
                  split_method: value,
                  split_value: value === 'percentage' ? 50 : Math.round(expenseAmount / 2)
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">
                  <div className="flex items-center gap-2">
                    <Percent className="w-3 h-3" />
                    %
                  </div>
                </SelectItem>
                <SelectItem value="amount">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3" />
                    Value
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-32 space-y-2">
            <label className="text-xs font-medium">Value</label>
            <Input
              type="number"
              step={newSplit.split_method === 'percentage' ? '1' : '0.01'}
              min="0"
              max={newSplit.split_method === 'percentage' ? '100' : expenseAmount.toString()}
              value={newSplit.split_value || ''}
              onChange={(e) => setNewSplit({ ...newSplit, split_value: parseFloat(e.target.value) || 0 })}
              placeholder={newSplit.split_method === 'percentage' ? '%' : '0.00'}
            />
          </div>

          <Button
            size="sm"
            onClick={addSplit}
            disabled={!newSplit.household_person_id || !newSplit.split_value}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {availablePersons.length === 0 && splits.length > 0 && (
        <p className="text-xs text-muted-foreground">All household members have been added to the split</p>
      )}
    </div>
  );
};

export default ExpenseMultiSplitManager;
