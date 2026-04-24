import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAutomationRules } from '@/hooks/useAutomationRules';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useHouseholdData } from '@/hooks/useHouseholdData';
import { ExpenseAutomationRule } from '@/interfaces';
import { CategoryGroupSelect } from './CategoryGroupSelect';

interface AddAutomationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddAutomationRuleDialog = ({ open, onOpenChange, onSuccess }: AddAutomationRuleDialogProps) => {
  const { addRule } = useAutomationRules();
  const { categories, categoryGroups } = useExpenseData();
  const { householdPersons } = useHouseholdData();
  
  const [ruleType, setRuleType] = useState<'delete' | 'split'>('delete');
  const [merchantPattern, setMerchantPattern] = useState('');
  const [descriptionPattern, setDescriptionPattern] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [categorySelectionType, setCategorySelectionType] = useState<'category' | 'group' | ''>('');
  const [householdPersonId, setHouseholdPersonId] = useState('');
  const [splitAmount, setSplitAmount] = useState('50');
  const [splitMethod, setSplitMethod] = useState<'amount' | 'percentage'>('percentage');

  const handleCategoryChange = (value: string, type: 'category' | 'group') => {
    setCategoryValue(value);
    setCategorySelectionType(value ? type : '');
  };

  const handleSubmit = async () => {
    const rule: Omit<ExpenseAutomationRule, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
      rule_type: ruleType,
      merchant_pattern: merchantPattern || undefined,
      description_pattern: descriptionPattern || undefined,
      category_id: categorySelectionType === 'category' ? categoryValue : undefined,
      category_group_id: categorySelectionType === 'group' ? categoryValue : undefined,
      household_person_id: householdPersonId || undefined,
      split_amount: splitAmount ? parseFloat(splitAmount) : undefined,
      split_method: splitMethod,
      is_active: true,
    };

    try {
      await addRule(rule);
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error('Error adding rule:', error);
    }
  };

  const resetForm = () => {
    setRuleType('delete');
    setMerchantPattern('');
    setDescriptionPattern('');
    setCategoryValue('');
    setCategorySelectionType('');
    setHouseholdPersonId('');
    setSplitAmount('50');
    setSplitMethod('percentage');
  };

  const isValid = () => {
    if (ruleType === 'delete') {
      return merchantPattern || descriptionPattern;
    } else {
      return (merchantPattern || categoryValue) && householdPersonId && splitAmount;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Automation Rule</DialogTitle>
          <DialogDescription>
            Create a rule to automatically process expenses during file uploads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Rule Type</Label>
            <RadioGroup
              value={ruleType}
              onValueChange={(value: 'delete' | 'split') => {
                setRuleType(value);
                if (value === 'split' && !splitAmount) {
                  setSplitAmount('50');
                  setSplitMethod('percentage');
                }
              }}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete" id="delete" />
                <Label htmlFor="delete">Auto Delete</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="split" id="split" />
                <Label htmlFor="split">Auto Split</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="merchant">Merchant Pattern (optional)</Label>
            <Input
              id="merchant"
              value={merchantPattern}
              onChange={(e) => setMerchantPattern(e.target.value)}
              placeholder="e.g., Starbucks, Amazon"
            />
          </div>

          {ruleType === 'delete' && (
            <div>
              <Label htmlFor="description">Description Pattern (optional)</Label>
              <Input
                id="description"
                value={descriptionPattern}
                onChange={(e) => setDescriptionPattern(e.target.value)}
                placeholder="e.g., ATM Fee, Transfer"
              />
            </div>
          )}

          {ruleType === 'split' && (
            <>
              <div>
                <Label htmlFor="category">Category or Category Group (optional)</Label>
                <CategoryGroupSelect
                  categories={categories}
                  categoryGroups={categoryGroups}
                  value={categoryValue}
                  selectionType={categorySelectionType}
                  onValueChange={handleCategoryChange}
                  placeholder="Select category or group"
                />
                {categorySelectionType === 'group' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    This rule will apply to all categories in this group
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="person">Split With</Label>
                <Select value={householdPersonId} onValueChange={setHouseholdPersonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {householdPersons.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="splitAmount">Split Amount</Label>
                  <Input
                    id="splitAmount"
                    type="number"
                    value={splitAmount}
                    onChange={(e) => setSplitAmount(e.target.value)}
                    placeholder="50"
                  />
                </div>
                <div>
                  <Label htmlFor="splitMethod">Method</Label>
                  <Select value={splitMethod} onValueChange={(value: 'amount' | 'percentage') => setSplitMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="amount">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid()}>
            Add Rule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
