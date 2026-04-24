import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { SavingsAccount } from '@/interfaces/savings';
import { useSavingsData } from '@/hooks/useSavingsData';

interface UpdateBalanceDialogProps {
  children: React.ReactNode;
  account: SavingsAccount;
  month: number;
  year: number;
  currentBalance?: number;
  currentStockQuantity?: number;
  currentStockPrice?: number;
  onUpdate?: () => void;
}

const UpdateBalanceDialog = ({ 
  children, 
  account, 
  month, 
  year, 
  currentBalance = 0,
  currentStockQuantity = 0,
  currentStockPrice = 0,
  onUpdate
}: UpdateBalanceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(currentBalance.toString());
  const [stockQuantity, setStockQuantity] = useState(currentStockQuantity.toString());
  const [stockPrice, setStockPrice] = useState(currentStockPrice.toString());
  const [notes, setNotes] = useState('');
  
  const { updateSavingsSnapshot } = useSavingsData();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (account.holding_type === 'stock') {
        const quantity = parseFloat(stockQuantity) || 0;
        const pricePerShare = parseFloat(stockPrice) || 0;
        const totalValue = quantity * pricePerShare;
        
        await updateSavingsSnapshot(
          account.id,
          month,
          year,
          totalValue,
          notes,
          quantity,
          pricePerShare
        );
      } else {
        await updateSavingsSnapshot(
          account.id,
          month,
          year,
          parseFloat(balance) || 0,
          notes
        );
      }
      
      // Refresh the parent component data
      onUpdate?.();
      setOpen(false);
    } catch (error) {
      console.error('Failed to update savings snapshot:', error);
    }
  };

  const calculateTotalValue = () => {
    if (account.holding_type !== 'stock') return parseFloat(balance) || 0;
    const quantity = parseFloat(stockQuantity) || 0;
    const pricePerShare = parseFloat(stockPrice) || 0;
    return quantity * pricePerShare;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Balance - {account.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {account.holding_type === 'currency' ? (
            <div className="space-y-2">
              <Label htmlFor="balance">Balance ({account.currency})</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="Enter balance"
                required
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  step="0.0001"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Enter number of shares"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div>
                  <Label htmlFor="stockPrice">Price per Share ({account.currency})</Label>
                </div>
                <Input
                  id="stockPrice"
                  type="number"
                  step="0.01"
                  value={stockPrice}
                  onChange={(e) => setStockPrice(e.target.value)}
                  placeholder="Enter price per share"
                  required
                />
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Total Portfolio Value</p>
                <p className="text-lg font-bold">
                  {account.currency} {calculateTotalValue().toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this update..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Update Balance
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateBalanceDialog;