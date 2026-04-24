import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSavingsData } from '@/hooks/useSavingsData';

interface AddSavingsAccountDialogProps {
  children: React.ReactNode;
}

const AddSavingsAccountDialog = ({ children }: AddSavingsAccountDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    currency: string;
    account_type: string;
    holding_type: 'currency' | 'stock';
    stock_symbol: string;
    stock_name: string;
    stock_quantity: string;
  }>({
    name: '',
    description: '',
    currency: 'USD',
    account_type: 'savings',
    holding_type: 'currency',
    stock_symbol: '',
    stock_name: '',
    stock_quantity: ''
  });
  const { addSavingsAccount } = useSavingsData();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const accountData = {
        name: formData.name,
        description: formData.description,
        currency: formData.currency,
        account_type: formData.account_type,
        holding_type: formData.holding_type,
        ...(formData.holding_type === 'stock' && {
          stock_symbol: formData.stock_symbol,
          stock_name: formData.stock_name
        })
      };
      
      await addSavingsAccount(accountData);
      
      // Reset form and close dialog only after successful creation
      setFormData({ 
        name: '', 
        description: '', 
        currency: 'USD', 
        account_type: 'savings',
        holding_type: 'currency',
        stock_symbol: '',
        stock_name: '',
        stock_quantity: ''
      });
      setOpen(false);
    } catch (error) {
      // Error is already handled in the hook
      console.error('Failed to create savings account:', error);
    }
  };

  const accountTypes = [
    { value: 'savings', label: 'Savings Account' },
    { value: 'checking', label: 'Checking Account' },
    { value: 'investment', label: 'Investment Account' },
    { value: 'emergency', label: 'Emergency Fund' },
    { value: 'retirement', label: 'Retirement Account' },
    { value: 'other', label: 'Other' }
  ];

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'RON', label: 'RON - Romanian Leu' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Savings Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Emergency Fund, Vacation Savings"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Account Type</Label>
            <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="holding_type">What does this account hold?</Label>
            <Select value={formData.holding_type} onValueChange={(value: 'currency' | 'stock') => 
              setFormData({ ...formData, holding_type: value, stock_symbol: '', stock_name: '', stock_quantity: '' })
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currency">Cash/Currency</SelectItem>
                <SelectItem value="stock">Stocks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.holding_type === 'stock' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="stock_symbol">Stock Symbol</Label>
                <Input
                  id="stock_symbol"
                  value={formData.stock_symbol}
                  onChange={(e) => setFormData({ ...formData, stock_symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., AAPL, TSLA, GOOGL"
                  required={formData.holding_type === 'stock'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_name">Company Name</Label>
                <Input
                  id="stock_name"
                  value={formData.stock_name}
                  onChange={(e) => setFormData({ ...formData, stock_name: e.target.value })}
                  placeholder="e.g., Apple Inc., Tesla Inc."
                  required={formData.holding_type === 'stock'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Number of Shares</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="e.g., 10, 0.5"
                  required={formData.holding_type === 'stock'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Base Currency for Valuation</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add notes about this account..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name.trim()}>
              Create Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSavingsAccountDialog;