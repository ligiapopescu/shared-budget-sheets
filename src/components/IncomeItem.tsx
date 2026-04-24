
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Income } from '@/interfaces';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';

interface IncomeItemProps {
  income: Income;
  onDeleteIncome: (id: string) => void;
  onUpdateIncome: (id: string, data: Partial<Income>) => void;
  onSaveNew?: (incomeData: Omit<Income, 'id' | 'user_id'>) => Promise<void>;
  onCancelNew?: () => void;
  displayCurrency?: string;
  isNew?: boolean;
}

const IncomeItem = ({ 
  income, 
  onDeleteIncome, 
  onUpdateIncome, 
  onSaveNew,
  onCancelNew,
  displayCurrency = 'USD',
  isNew = false
}: IncomeItemProps) => {
  const [isEditing, setIsEditing] = useState(isNew);
  const [editData, setEditData] = useState({
    source: income.source,
    amount: income.amount.toString(),
    date: income.date,
    currency: income.currency,
    description: income.description || '',
  });
  const { convertAmount, getCurrencySymbol } = useCurrencyConverter();

  const handleSave = async () => {
    if (isNew && onSaveNew) {
      await onSaveNew({
        source: editData.source,
        amount: parseFloat(editData.amount),
        date: editData.date,
        currency: editData.currency,
        description: editData.description || undefined,
      });
    } else {
      onUpdateIncome(income.id, {
        source: editData.source,
        amount: parseFloat(editData.amount),
        date: editData.date,
        currency: editData.currency,
        description: editData.description || undefined,
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (isNew && onCancelNew) {
      onCancelNew();
    } else {
      setEditData({
        source: income.source,
        amount: income.amount.toString(),
        date: income.date,
        currency: income.currency,
        description: income.description || '',
      });
      setIsEditing(false);
    }
  };

  const displayAmount = convertAmount(income.amount, income.currency, displayCurrency);
  const formattedDate = new Date(income.date).toLocaleDateString();

  if (isEditing) {
    return (
      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                value={editData.source}
                onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                placeholder="Income source"
              />
            </div>
            <div>
              <Input
                type="number"
                step="0.01"
                value={editData.amount}
                onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                placeholder="Amount"
              />
            </div>
            <div>
              <Input
                type="date"
                value={editData.date}
                onChange={(e) => setEditData({ ...editData, date: e.target.value })}
              />
            </div>
            <div>
              <Select value={editData.currency} onValueChange={(value) => setEditData({ ...editData, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="RON">RON (Lei)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex items-center gap-1">
              <Check className="w-4 h-4" />
              Save
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm" className="flex items-center gap-1">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-lg">{income.source}</h3>
              <Badge variant="secondary" className="text-green-700 bg-green-100">
                +{getCurrencySymbol(displayCurrency)}{displayAmount.toFixed(2)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{formattedDate}</span>
              {income.currency !== displayCurrency && (
                <span className="text-xs text-gray-500">
                  (Original: {getCurrencySymbol(income.currency)}{income.amount.toFixed(2)})
                </span>
              )}
            </div>
            {income.description && (
              <p className="text-sm text-gray-700 mt-2">{income.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Income Record</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this income record? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteIncome(income.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeItem;
