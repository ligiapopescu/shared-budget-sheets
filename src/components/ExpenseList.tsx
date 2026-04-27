
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Save, X, ChevronLeft, ChevronRight, User, Users, Check, FolderEdit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { TableCell, TableRow } from '@/components/ui/table';
import { Expense, Category, CategoryGroup } from '@/interfaces';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { format } from 'date-fns';
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';
import DatePickerInput from '@/components/DatePickerInput';
import { CurrencySelectItems } from '@/components/CurrencySelectItems';
import BulkSplitExpenseDialog from '@/components/debt/BulkSplitExpenseDialog';
import BulkChangeCategoryDialog from '@/components/debt/BulkChangeCategoryDialog';
import { useHouseholdData } from '@/hooks/useHouseholdData';
import { createPortal } from 'react-dom';
import ExpenseMultiSplitManager from '@/components/ExpenseMultiSplitManager';
import CategorySelect from '@/components/CategorySelect';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  categoryGroups?: CategoryGroup[];
  onDeleteExpense: (id: string) => void;
  onUpdateExpense: (id: string, data: Partial<Expense>) => void;
  onAddExpense: (expenseData: Omit<Expense, 'id' | 'user_id'>) => Promise<void>;
  displayCurrency?: string;
  onUploadClick?: () => void;
  removeSplitFromExpense?: (expenseId: string) => void;
  refreshData?: () => void;
}

const ExpenseList = ({ 
  expenses, 
  categories,
  categoryGroups,
  onDeleteExpense, 
  onUpdateExpense, 
  onAddExpense,
  displayCurrency = 'USD',
  onUploadClick,
  removeSplitFromExpense,
  refreshData
}: ExpenseListProps) => {
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Expense>>({});
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [newExpenseData, setNewExpenseData] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    amount: 0,
    category: categories[0]?.name || 'Other',
    currency: displayCurrency,
    description: '',
  });
  const { dateFormat } = useDateFormatPreference();
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [showChangeCategoryDialog, setShowChangeCategoryDialog] = useState(false);
  const [openSplitPopover, setOpenSplitPopover] = useState<string | null>(null);
  const { householdPersons, addDebtEntry } = useHouseholdData();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Default date for new expense based on selected month/year
  const getDefaultDateForSelection = () => {
    const today = new Date();
    if (selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1) {
      return format(today, 'yyyy-MM-dd');
    }
    return format(new Date(selectedYear, selectedMonth - 1, 1), 'yyyy-MM-dd');
  };

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

  // Generate unique merchants for filter
  const uniqueMerchants = useMemo(() => {
    const merchants = new Set<string>();
    expenses.forEach(expense => merchants.add(expense.merchant));
    return Array.from(merchants).sort().map(merchant => ({ label: merchant, value: merchant }));
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;
    
    // Apply date filter for selected month/year
    filtered = filtered.filter(expense => {
      const date = new Date(expense.date);
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });
    
    // Apply filters
    Object.entries(filters).forEach(([columnId, value]) => {
      if (!value) return;
      
      switch (columnId) {
        case 'date':
          if (value.includes('-')) {
            // Month filter (YYYY-MM format)
            filtered = filtered.filter(expense => {
              const date = new Date(expense.date);
              const expenseMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              return expenseMonth === value;
            });
          } else {
            // Specific date filter
            filtered = filtered.filter(expense => expense.date === value);
          }
          break;
        case 'merchant':
          filtered = filtered.filter(expense => 
            expense.merchant.toLowerCase().includes(value.toLowerCase())
          );
          break;
        case 'category':
          filtered = filtered.filter(expense => expense.category === value);
          break;
        case 'amount':
          const filterAmount = parseFloat(value);
          if (!isNaN(filterAmount)) {
            filtered = filtered.filter(expense => {
              const convertedAmount = convertAmount(expense.amount, expense.currency, displayCurrency);
              return convertedAmount >= filterAmount;
            });
          }
          break;
        case 'description':
          filtered = filtered.filter(expense => 
            expense.description?.toLowerCase().includes(value.toLowerCase())
          );
          break;
      }
    });
    
    return filtered;
  }, [expenses, filters, convertAmount, displayCurrency, selectedMonth, selectedYear]);

  const handleStartCellEdit = (itemId: string, columnId: string) => {
    const expense = expenses.find(e => e.id === itemId);
    if (expense) {
      setEditingCell(`${itemId}-${columnId}`);
      setEditData(expense);
    }
  };

  const handleSaveCellEdit = () => {
    if (editingCell && editData.id) {
      onUpdateExpense(editData.id, editData);
    }
    setEditingCell(null);
    setEditData({});
  };

  const handleCancelCellEdit = () => {
    setEditingCell(null);
    setEditData({});
  };

  const handleBulkDelete = () => {
    selectedExpenses.forEach(expenseId => {
      onDeleteExpense(expenseId);
    });
    setSelectedExpenses(new Set());
  };

  // Selected expenses as full objects
  const selectedExpensesArray = useMemo(() => {
    if (selectedExpenses.size === 0) return [] as Expense[];
    const ids = selectedExpenses;
    return expenses.filter(e => ids.has(e.id));
  }, [expenses, selectedExpenses]);

  const handleBulkSplit = async ({ household_person_id, splitType, splitValue }: { household_person_id: string; splitType: 'amount' | 'percentage'; splitValue: number; }) => {
    const ops = selectedExpensesArray.map((expense) => {
      let amountToSplit = 0;
      if (splitType === 'percentage') {
        amountToSplit = parseFloat(((expense.amount * splitValue) / 100).toFixed(2));
      } else {
        // Convert entered amount (in displayCurrency) to expense currency
        amountToSplit = parseFloat(
          convertAmount(splitValue, displayCurrency, expense.currency).toFixed(2)
        );
      }
      if (amountToSplit <= 0) return Promise.resolve();

      return addDebtEntry({
        household_person_id,
        amount: amountToSplit,
        currency: expense.currency,
        description: `Split of ${expense.merchant} (${splitType === 'percentage' ? `${splitValue}%` : `${displayCurrency} ${splitValue}`})`,
        date: expense.date,
        type: 'owe_me',
        expense_id: expense.id,
        split_method: splitType,
        split_value: splitType === 'percentage' ? splitValue : amountToSplit,
        resolved: false,
      });
    });

    await Promise.all(ops);
    if (refreshData) refreshData();
    setShowSplitDialog(false);
    setSelectedExpenses(new Set());
  };

  const handleBulkChangeCategory = (newCategory: string) => {
    selectedExpenses.forEach(expenseId => {
      onUpdateExpense(expenseId, { category: newCategory });
    });
    setSelectedExpenses(new Set());
    setShowChangeCategoryDialog(false);
  };
  const formatCurrency = (amount: number, currency: string) => {
    const convertedAmount = convertAmount(amount, currency, displayCurrency);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(convertedAmount);
  };

  // Column definitions
  const columns: ColumnDef<Expense>[] = [
    {
      id: 'date',
      header: 'Date',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [],
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
<DatePickerInput
            value={editData.date || ''}
            onChange={(val) => {
              const updatedData = { ...editData, date: val };
              onEditDataChange(updatedData);
              // Save immediately with the new date value
              if (editData.id) {
                onUpdateExpense(editData.id, updatedData);
              }
              setEditingCell(null);
              setEditData({});
            }}
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {format(new Date(expense.date), dateFormat)}
          </span>
        )
      ),
    },
    {
      id: 'merchant',
      header: 'Merchant',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Input
            value={editData.merchant || ''}
            onChange={(e) => onEditDataChange({ ...editData, merchant: e.target.value })}
            onBlur={handleSaveCellEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCellEdit();
              if (e.key === 'Escape') handleCancelCellEdit();
            }}
            placeholder="Merchant name"
            autoFocus
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {expense.merchant}
          </span>
        )
      ),
    },
    {
      id: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterComponent: (value, onChange) => (
        <CategorySelect
          categories={categories}
          categoryGroups={categoryGroups}
          value={value || ''}
          onValueChange={(val) => onChange(val === '__all__' ? null : val)}
          showAllOption={true}
          placeholder="All categories"
          className="w-full"
        />
      ),
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => {
        const categoryColor = categories.find(cat => cat.name === expense.category)?.color || '#3b82f6';
        
        return (
          <div className="cursor-pointer">
            <CategorySelect
              categories={categories}
              categoryGroups={categoryGroups}
              value={expense.category}
              onValueChange={(value) => {
                onUpdateExpense(expense.id, { category: value });
              }}
              showBadge={true}
              triggerClassName="border-0 shadow-none hover:bg-gray-100 p-2"
            />
          </div>
        );
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      sortable: true,
      filterable: true,
      filterType: 'number',
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => (
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
              <Badge variant="secondary" className="text-red-700 bg-red-100 w-fit">
                -{formatCurrency(expense.amount, expense.currency)}
              </Badge>
              {expense.currency !== displayCurrency && (
                <span className="text-xs text-gray-500 mt-1">
                  (Original: {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)})
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
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => (
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
            {expense.description || '—'}
          </span>
        )
      ),
    },
    {
      id: 'split',
      header: 'Split',
      cell: (expense) => {
        if (householdPersons.length === 0) {
          return <span className="text-gray-400 text-sm">No household persons</span>;
        }

        const isOpen = openSplitPopover === expense.id;

        return (
          <Popover 
            open={isOpen} 
            onOpenChange={(open) => setOpenSplitPopover(open ? expense.id : null)}
          >
            <PopoverTrigger asChild>
              <div className="cursor-pointer hover:bg-muted px-2 py-1 rounded block min-w-[100px]">
                {expense.splits && expense.splits.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {expense.splits.map((split, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {split.household_person_name}: {split.split_method === 'percentage' 
                          ? `${split.split_value}%` 
                          : `${formatCurrency(split.split_value, expense.currency)}`}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Split</span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4 z-50" align="start">
              <ExpenseMultiSplitManager
                householdPersons={householdPersons}
                expenseAmount={expense.amount}
                expenseCurrency={expense.currency}
                splits={expense.splits || []}
                onSplitsChange={async (splits) => {
                  try {
                    // Update the expense with new splits
                    await onUpdateExpense(expense.id, { splits });
                    // Refresh data to get updated splits from database
                    if (refreshData) {
                      await refreshData();
                    }
                  } catch (error) {
                    console.error('Error updating expense splits:', error);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 'text-right',
      cell: (expense) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="destructive" onClick={() => onDeleteExpense(expense.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // New expense row component
  const newRowComponent = (
    <TableRow>
      <TableCell></TableCell>
      <TableCell>
<DatePickerInput
          value={newExpenseData.date || ''}
          onChange={(val) => setNewExpenseData({ ...newExpenseData, date: val })}
          className="w-36"
        />
      </TableCell>
      <TableCell>
        <Input
          value={newExpenseData.merchant}
          onChange={(e) => setNewExpenseData({ ...newExpenseData, merchant: e.target.value })}
          placeholder="Merchant name"
        />
      </TableCell>
      <TableCell>
        <CategorySelect
          categories={categories}
          categoryGroups={categoryGroups}
          value={newExpenseData.category || ''}
          onValueChange={(value) => setNewExpenseData({ ...newExpenseData, category: value })}
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
<Input
            type="number"
            step="0.01"
            value={newExpenseData.amount}
            onChange={(e) => setNewExpenseData({ ...newExpenseData, amount: parseFloat(e.target.value) })}
            placeholder="Amount"
            className="min-w-[144px] flex-[2]"
          />
          <Select
            value={newExpenseData.currency}
            onValueChange={(value) => setNewExpenseData({ ...newExpenseData, currency: value })}
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
          value={newExpenseData.description}
          onChange={(e) => setNewExpenseData({ ...newExpenseData, description: e.target.value })}
          placeholder="Description (optional)"
        />
      </TableCell>
      <TableCell>
        {/* Empty cell for split column alignment */}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={async () => {
            await onAddExpense({
              merchant: newExpenseData.merchant!,
              amount: newExpenseData.amount!,
              date: newExpenseData.date!,
              category: newExpenseData.category!,
              currency: newExpenseData.currency!,
              description: newExpenseData.description,
            });
            setShowNewExpense(false);
            setNewExpenseData({
              date: getDefaultDateForSelection(),
              merchant: '',
              amount: 0,
              category: categories[0]?.name || 'Other',
              currency: displayCurrency,
              description: '',
            });
          }}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNewExpense(false)}>
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
        title="Expense Records"
        description="Your expense entries"
        data={filteredExpenses}
        columns={columns}
        keyField="id"
        selectedItems={selectedExpenses}
        onSelectionChange={setSelectedExpenses}
        onAddNew={() => {
          setNewExpenseData(prev => ({ ...prev, date: getDefaultDateForSelection() }));
          setShowNewExpense(true);
        }}
        addNewLabel="Add Expense"
        onUpload={onUploadClick}
        uploadLabel="Upload bulk"
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
        showNewRow={showNewExpense}
      />
      
      {/* Bulk Split Dialog is rendered below */}
      <BulkSplitExpenseDialog
        open={showSplitDialog}
        onOpenChange={setShowSplitDialog}
        selectedExpenses={selectedExpensesArray}
        householdPersons={householdPersons}
        onBulkSplit={handleBulkSplit}
        displayCurrency={displayCurrency}
        convertAmount={convertAmount}
      />

      {/* Bottom Action Bar */}
      {selectedExpenses.size > 0 && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3 flex items-center justify-end gap-2">
            {selectedExpenses.size > 1 && (
              <Button size="sm" onClick={() => setShowSplitDialog(true)}>
                <User className="w-4 h-4 mr-2" />
                Split ({selectedExpenses.size})
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowChangeCategoryDialog(true)}>
              <FolderEdit className="w-4 h-4 mr-2" />
              Change Category ({selectedExpenses.size})
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedExpenses.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Expenses</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedExpenses.size} selected expense(s)? 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleBulkDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Change Category Dialog */}
      <BulkChangeCategoryDialog
        open={showChangeCategoryDialog}
        onOpenChange={setShowChangeCategoryDialog}
        selectedCount={selectedExpenses.size}
        categories={categories}
        categoryGroups={categoryGroups}
        onConfirm={handleBulkChangeCategory}
      />

    </>
  );
};

export default ExpenseList;
