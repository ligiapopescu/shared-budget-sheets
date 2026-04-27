import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Save, X, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { TableCell, TableRow } from '@/components/ui/table';
import { Income } from '@/interfaces';
import { useState, useMemo } from 'react';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { DataTable, ColumnDef, BulkAction } from '@/components/ui/data-table';
import { format } from 'date-fns';
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';
import DatePickerInput from '@/components/DatePickerInput';
import { CurrencySelectItems } from '@/components/CurrencySelectItems';

interface IncomeListProps {
  incomes: Income[];
  onDeleteIncome: (id: string) => void;
  onUpdateIncome: (id: string, data: Partial<Income>) => void;
  onAddIncome: (incomeData: Omit<Income, 'id' | 'user_id'>) => Promise<void>;
  displayCurrency?: string;
}

const IncomeList = ({ 
  incomes, 
  onDeleteIncome, 
  onUpdateIncome, 
  onAddIncome,
  displayCurrency = 'USD'
}: IncomeListProps) => {
  const [selectedIncomes, setSelectedIncomes] = useState<Set<string>>(new Set());
  const [showNewIncome, setShowNewIncome] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Income>>({});
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [newIncomeData, setNewIncomeData] = useState<Partial<Income>>({
    date: new Date().toISOString().split('T')[0],
    source: '',
    amount: 0,
    currency: displayCurrency,
    description: '',
  });
  const { dateFormat } = useDateFormatPreference();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;
    
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        newMonth = 12;
        newYear = selectedYear - 1;
      } else {
        newMonth = selectedMonth - 1;
      }
    } else {
      if (selectedMonth === 12) {
        newMonth = 1;
        newYear = selectedYear + 1;
      } else {
        newMonth = selectedMonth + 1;
      }
    }

    // Don't allow navigation to future months
    const isNewMonthFuture = newYear > currentDate.getFullYear() || 
      (newYear === currentDate.getFullYear() && newMonth > currentDate.getMonth() + 1);
    
    if (!isNewMonthFuture) {
      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
    }
  };

  const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1;
  
  const { convertAmount, getCurrencySymbol } = useCurrencyConverter();

  // Generate unique sources for filter
  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    incomes.forEach(income => sources.add(income.source));
    return Array.from(sources).sort().map(source => ({ label: source, value: source }));
  }, [incomes]);

  // Filter and sort incomes
  const filteredIncomes = useMemo(() => {
    let filtered = incomes;
    
    // Apply date filter for selected month/year
    filtered = filtered.filter(income => {
      const date = new Date(income.date);
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });
    
    // Apply filters
    Object.entries(filters).forEach(([columnId, value]) => {
      if (!value) return;
      
      switch (columnId) {
        case 'date':
          if (value.includes('-')) {
            // Month filter (YYYY-MM format)
            filtered = filtered.filter(income => {
              const date = new Date(income.date);
              const incomeMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              return incomeMonth === value;
            });
          } else {
            // Specific date filter
            filtered = filtered.filter(income => income.date === value);
          }
          break;
        case 'source':
          filtered = filtered.filter(income => 
            income.source.toLowerCase().includes(value.toLowerCase())
          );
          break;
        case 'amount':
          const filterAmount = parseFloat(value);
          if (!isNaN(filterAmount)) {
            filtered = filtered.filter(income => {
              const convertedAmount = convertAmount(income.amount, income.currency, displayCurrency);
              return convertedAmount >= filterAmount;
            });
          }
          break;
        case 'description':
          filtered = filtered.filter(income => 
            income.description?.toLowerCase().includes(value.toLowerCase())
          );
          break;
      }
    });
    
    return filtered;
  }, [incomes, filters, convertAmount, displayCurrency, selectedMonth, selectedYear]);

  const handleStartCellEdit = (itemId: string, columnId: string) => {
    const income = incomes.find(i => i.id === itemId);
    if (income) {
      setEditingCell(`${itemId}-${columnId}`);
      setEditData(income);
    }
  };

  const handleSaveCellEdit = () => {
    if (editingCell && editData.id) {
      onUpdateIncome(editData.id, editData);
    }
    setEditingCell(null);
    setEditData({});
  };

  const handleCancelCellEdit = () => {
    setEditingCell(null);
    setEditData({});
  };

  const handleBulkDelete = () => {
    selectedIncomes.forEach(incomeId => {
      onDeleteIncome(incomeId);
    });
    setSelectedIncomes(new Set());
  };

  const formatCurrency = (amount: number, currency: string) => {
    const convertedAmount = convertAmount(amount, currency, displayCurrency);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(convertedAmount);
  };

  // Column definitions
  const columns: ColumnDef<Income>[] = [
    {
      id: 'date',
      header: 'Date',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      cell: (income, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
<DatePickerInput
            value={editData.date || ''}
            onChange={(val) => onEditDataChange({ ...editData, date: val })}
            onCommit={handleSaveCellEdit}
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {format(new Date(income.date), dateFormat)}
          </span>
        )
      ),
    },
    {
      id: 'source',
      header: 'Source',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cell: (income, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Input
            value={editData.source || ''}
            onChange={(e) => onEditDataChange({ ...editData, source: e.target.value })}
            onBlur={handleSaveCellEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCellEdit();
              if (e.key === 'Escape') handleCancelCellEdit();
            }}
            placeholder="Income source"
            autoFocus
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {income.source}
          </span>
        )
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      sortable: true,
      filterable: true,
      filterType: 'number',
      cell: (income, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={editData.amount || ''}
              onChange={(e) => onEditDataChange({ ...editData, amount: parseFloat(e.target.value) })}
              onBlur={handleSaveCellEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCellEdit();
                if (e.key === 'Escape') handleCancelCellEdit();
              }}
              placeholder="Amount"
              className="flex-1"
              autoFocus
            />
            <Select
              value={editData.currency || ''}
              onValueChange={(value) => onEditDataChange({ ...editData, currency: value })}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <CurrencySelectItems />
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            <div className="flex flex-col">
              <Badge variant="secondary" className="text-green-700 bg-green-100 w-fit">
                +{formatCurrency(income.amount, income.currency)}
              </Badge>
              {income.currency !== displayCurrency && (
                <span className="text-xs text-gray-500 mt-1">
                  (Original: {getCurrencySymbol(income.currency)}{income.amount.toFixed(2)})
                </span>
              )}
            </div>
          </span>
        )
      ),
    },
    {
      id: 'description',
      header: 'Description',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cell: (income, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Input
            value={editData.description || ''}
            onChange={(e) => onEditDataChange({ ...editData, description: e.target.value })}
            onBlur={handleSaveCellEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCellEdit();
              if (e.key === 'Escape') handleCancelCellEdit();
            }}
            placeholder="Description (optional)"
            autoFocus
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {income.description || '—'}
          </span>
        )
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 'text-right',
      cell: (income) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="destructive" onClick={() => onDeleteIncome(income.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // New income row component
  const newRowComponent = (
    <TableRow>
      <TableCell></TableCell>
      <TableCell>
<DatePickerInput
          value={newIncomeData.date || ''}
          onChange={(val) => setNewIncomeData({ ...newIncomeData, date: val })}
        />
      </TableCell>
      <TableCell>
        <Input
          value={newIncomeData.source}
          onChange={(e) => setNewIncomeData({ ...newIncomeData, source: e.target.value })}
          placeholder="Income source"
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            value={newIncomeData.amount}
            onChange={(e) => setNewIncomeData({ ...newIncomeData, amount: parseFloat(e.target.value) })}
            placeholder="Amount"
            className="flex-1"
          />
          <Select
            value={newIncomeData.currency}
            onValueChange={(value) => setNewIncomeData({ ...newIncomeData, currency: value })}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <CurrencySelectItems />
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell>
        <Input
          value={newIncomeData.description}
          onChange={(e) => setNewIncomeData({ ...newIncomeData, description: e.target.value })}
          placeholder="Description (optional)"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={async () => {
            await onAddIncome({
              source: newIncomeData.source!,
              amount: newIncomeData.amount!,
              date: newIncomeData.date!,
              currency: newIncomeData.currency!,
              description: newIncomeData.description,
            });
            setShowNewIncome(false);
            setNewIncomeData({
              date: new Date().toISOString().split('T')[0],
              source: '',
              amount: 0,
              currency: displayCurrency,
              description: '',
            });
          }}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNewIncome(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      {/* Month Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">
                {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')}
              </h3>
              {isCurrentMonth && <span className="text-sm text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                  Current Month
                </span>}
            </div>

            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        title="Income Records"
        description="Your income entries"
        data={filteredIncomes}
        columns={columns}
        keyField="id"
        selectedItems={selectedIncomes}
        onSelectionChange={setSelectedIncomes}
        onAddNew={() => setShowNewIncome(true)}
        addNewLabel="Add Income"
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters({})}
        editingCell={editingCell}
        editData={editData}
        onEditDataChange={setEditData}
        onStartCellEdit={handleStartCellEdit}
        onSaveCellEdit={handleSaveCellEdit}
        onCancelCellEdit={handleCancelCellEdit}
        newRowComponent={newRowComponent}
        showNewRow={showNewIncome}
      />
      
      {/* Bulk Delete Dialog */}
      {selectedIncomes.size > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="fixed bottom-4 right-4">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedIncomes.size})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Income Records</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedIncomes.size} selected income record(s)? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default IncomeList;
