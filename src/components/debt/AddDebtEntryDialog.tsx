
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DebtEntry, HouseholdPerson } from '@/interfaces/debt';
import DatePickerInput from '@/components/DatePickerInput';
import { CurrencySelectItems } from '@/components/CurrencySelectItems';
import { DEBT_TYPE_LABELS } from '@/constants/debtTypes';

interface AddDebtEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDebtEntry: (debtData: Omit<DebtEntry, "id" | "user_id" | "created_at" | "updated_at" | "household_person">) => void;
  onUpdateDebtEntry?: (id: string, debtData: Partial<DebtEntry>) => void;
  householdPersons: HouseholdPerson[];
  editEntry?: DebtEntry | null;
}

const AddDebtEntryDialog = ({ open, onOpenChange, onAddDebtEntry, onUpdateDebtEntry, householdPersons, editEntry }: AddDebtEntryDialogProps) => {
  const [formData, setFormData] = useState({
    household_person_id: '',
    amount: '',
    currency: 'USD',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: '' as 'owe_me' | 'i_owe' | '',
  });
  const { toast } = useToast();

  // Update form data when editEntry changes
  useEffect(() => {
    if (editEntry) {
      setFormData({
        household_person_id: editEntry.household_person_id,
        amount: editEntry.amount.toString(),
        currency: editEntry.currency,
        description: editEntry.description || '',
        date: editEntry.date,
        type: editEntry.type,
      });
    } else {
      setFormData({
        household_person_id: '',
        amount: '',
        currency: 'USD',
        description: '',
        date: new Date().toISOString().split('T')[0],
        type: '',
      });
    }
  }, [editEntry, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.household_person_id || !formData.amount || !formData.type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (editEntry && onUpdateDebtEntry) {
      // Update existing entry
      onUpdateDebtEntry(editEntry.id, {
        household_person_id: formData.household_person_id,
        amount,
        currency: formData.currency,
        description: formData.description || undefined,
        date: formData.date,
        type: formData.type,
      });
      
      toast({
        title: "Success",
        description: "Debt entry updated successfully",
      });
    } else {
      // Add new entry
      onAddDebtEntry({
        household_person_id: formData.household_person_id,
        amount,
        currency: formData.currency,
        description: formData.description || undefined,
        date: formData.date,
        type: formData.type,
        resolved: false,
      });
      
      toast({
        title: "Success",
        description: "Debt entry added successfully",
      });
    }

    setFormData({
      household_person_id: '',
      amount: '',
      currency: 'USD',
      description: '',
      date: new Date().toISOString().split('T')[0],
      type: '',
    });
    onOpenChange(false);
  };

  if (householdPersons.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEntry ? 'Edit Debt Entry' : 'Add Debt Entry'}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">
              You need to add household members first before creating debt entries.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editEntry ? 'Edit Debt Entry' : 'Add Debt Entry'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="person">Person *</Label>
            <Select
              value={formData.household_person_id}
              onValueChange={(value) => setFormData({ ...formData, household_person_id: value })}
            >
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

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'owe_me' | 'i_owe') => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owe_me">{DEBT_TYPE_LABELS.owe_me}</SelectItem>
                <SelectItem value="i_owe">{DEBT_TYPE_LABELS.i_owe}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <CurrencySelectItems />
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
<Label htmlFor="date">Date *</Label>
            <DatePickerInput
              id="date"
              value={formData.date}
              onChange={(val) => setFormData({ ...formData, date: val })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editEntry ? 'Update Entry' : 'Add Entry'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDebtEntryDialog;
