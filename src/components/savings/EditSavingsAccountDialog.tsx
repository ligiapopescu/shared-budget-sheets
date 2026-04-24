import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SavingsAccount } from '@/interfaces/savings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EditSavingsAccountDialogProps {
  children: React.ReactNode;
  account: SavingsAccount;
  onUpdate: () => void;
}

const EditSavingsAccountDialog = ({ children, account, onUpdate }: EditSavingsAccountDialogProps) => {
  const { sheetsService } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    currency: string;
    account_type: string;
    holding_type: 'currency' | 'stock';
    stock_symbol: string;
    stock_name: string;
  }>({
    name: '',
    description: '',
    currency: 'USD',
    account_type: 'savings',
    holding_type: 'currency',
    stock_symbol: '',
    stock_name: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        description: account.description || '',
        currency: account.currency,
        account_type: account.account_type,
        holding_type: account.holding_type,
        stock_symbol: account.stock_symbol || '',
        stock_name: account.stock_name || ''
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const updateData = {
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

      if (!sheetsService) throw new Error('Not connected');
      await sheetsService.updateById('savings_accounts', account.id,
        Object.fromEntries(Object.entries(updateData).map(([k, v]) => [k, String(v ?? '')])));

      toast({
        title: "Success",
        description: "Savings account updated successfully"
      });

      onUpdate();
      setOpen(false);
    } catch (error: any) {
      console.error('Failed to update savings account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update savings account"
      });
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
          <DialogTitle>Edit Savings Account</DialogTitle>
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
            <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
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
              setFormData({ ...formData, holding_type: value, stock_symbol: value === 'currency' ? '' : formData.stock_symbol, stock_name: value === 'currency' ? '' : formData.stock_name })
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
              Update Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSavingsAccountDialog;