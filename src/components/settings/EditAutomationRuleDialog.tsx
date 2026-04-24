import { useState, useEffect } from 'react';
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

interface EditAutomationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: ExpenseAutomationRule;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditAutomationRuleDialog = ({ 
  open, 
  onOpenChange, 
  rule, 
  onClose,
  onSuccess 
}: EditAutomationRuleDialogProps) => {
  const { updateRule } = useAutomationRules();
  const { categories, categoryGroups } = useExpenseData();
  const { householdPersons } = useHouseholdData();
  
  const [ruleType, setRuleType] = useState<'delete' | 'split'>(rule.rule_type);
  const [merchantPattern, setMerchantPattern] = useState(rule.merchant_pattern || '');
  const [descriptionPattern, setDescriptionPattern] = useState(rule.description_pattern || '');
  const [categoryValue, setCategoryValue] = useState('');
  const [categorySelectionType, setCategorySelectionType] = useState<'category' | 'group' | ''>('');
  const [householdPersonId, setHouseholdPersonId] = useState(rule.household_person_id || '');
  const [splitAmount, setSplitAmount] = useState(rule.split_amount?.toString() || '');
  const [splitMethod, setSplitMethod] = useState<'amount' | 'percentage'>(rule.split_method || 'amount');

  useEffect(() => {
    setRuleType(rule.rule_type);
    setMerchantPattern(rule.merchant_pattern || '');
    setDescriptionPattern(rule.description_pattern || '');
    
    // Determine selection type and value
    if (rule.category_group_id) {
      setCategoryValue(rule.category_group_id);
      setCategorySelectionType('group');
    } else if (rule.category_id) {
      setCategoryValue(rule.category_id);
      setCategorySelectionType('category');
    } else {
      setCategoryValue('');
      setCategorySelectionType('');
    }
    
    setHouseholdPersonId(rule.household_person_id || '');
    setSplitAmount(rule.split_amount?.toString() || '');
    setSplitMethod(rule.split_method || 'amount');
  }, [rule]);

  const handleCategoryChange = (value: string, type: 'category' | 'group') => {
    setCategoryValue(value);
    setCategorySelectionType(value ? type : '');
  };

  const handleSubmit = async () => {
    const updates: Partial<ExpenseAutomationRule> = {
      rule_type: ruleType,
      merchant_pattern: merchantPattern || undefined,
      description_pattern: descriptionPattern || undefined,
      category_id: categorySelectionType === 'category' ? categoryValue : null,
      category_group_id: categorySelectionType === 'group' ? categoryValue : null,
      household_person_id: householdPersonId || undefined,
      split_amount: splitAmount ? parseFloat(splitAmount) : undefined,
      split_method: splitMethod,
    };

    try {
      await updateRule(rule.id, updates);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error updating rule:', error);
    }
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
          <DialogTitle>Edit Automation Rule</DialogTitle>
          <DialogDescription>
            Modify the automation rule settings
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid()}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
