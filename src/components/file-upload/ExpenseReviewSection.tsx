
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Check, X, Trash2, AlertCircle, CheckCircle, XCircle, RotateCcw, User, FolderEdit } from 'lucide-react';
import { Category, CategoryGroup, ExpenseSplit } from '@/interfaces';
import { HouseholdPerson } from '@/interfaces/debt';
import { DataTable, ColumnDef, BulkAction } from '@/components/ui/data-table';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import DatePickerInput from '@/components/DatePickerInput';
import ExpenseMultiSplitManager from '@/components/expense/ExpenseMultiSplitManager';
import CategorySelect from '@/components/CategorySelect';
import BulkChangeCategoryDialog from '@/components/debt/BulkChangeCategoryDialog';
import BulkSplitPendingExpenseDialog from '@/components/file-upload/BulkSplitPendingExpenseDialog';
import { CurrencySelectItems } from '@/components/CurrencySelectItems';
import { useInlineEdit } from '@/hooks/useInlineEdit';

interface PendingExpense {
  tempId: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  currency: string;
  description?: string;
  splits?: ExpenseSplit[];
}

interface CategorizedExpenses {
  automaticallyClassified: PendingExpense[];
  automaticallyDeleted: PendingExpense[];
  needsAttention: PendingExpense[];
}

interface ExpenseReviewSectionProps {
  categorizedExpenses: CategorizedExpenses;
  categories: Category[];
  categoryGroups?: CategoryGroup[];
  householdPersons: HouseholdPerson[];
  onUpdateExpense: (tempId: string, field: keyof PendingExpense, value: string, section: keyof CategorizedExpenses) => void;
  onUpdateExpenseSplit: (tempId: string, splits: ExpenseSplit[], section: keyof CategorizedExpenses) => void;
  onRemoveExpense: (tempId: string, section: keyof CategorizedExpenses) => void;
  onRestoreExpense: (tempId: string) => void;
  onConfirmAll: () => void;
  onCancel: () => void;
  isUploading?: boolean;
  onCategoryCreated?: () => void;
}

const ExpenseReviewSection = ({
  categorizedExpenses,
  categories,
  categoryGroups,
  householdPersons,
  onUpdateExpense,
  onUpdateExpenseSplit,
  onRemoveExpense,
  onRestoreExpense,
  onConfirmAll,
  onCancel,
  isUploading = false,
  onCategoryCreated
}: ExpenseReviewSectionProps) => {
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const { editingCell, editData, setEditData, startEdit, cancelEdit, parseEditingCell } =
    useInlineEdit<PendingExpense>();
  const [currentSection, setCurrentSection] = useState<keyof CategorizedExpenses>('needsAttention');
  const [showChangeCategoryDialog, setShowChangeCategoryDialog] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);

  const totalExpenses = categorizedExpenses.automaticallyClassified.length + 
                       categorizedExpenses.automaticallyDeleted.length + 
                       categorizedExpenses.needsAttention.length;

  if (totalExpenses === 0) return null;

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6b7280';
  };

  const handleStartCellEdit = (itemId: string, columnId: string) => {
    const expense = categorizedExpenses[currentSection].find(e => e.tempId === itemId);
    if (expense) startEdit(itemId, columnId, expense);
  };

  const handleSaveCellEdit = () => {
    const parsed = parseEditingCell();
    if (parsed && editData.tempId) {
      const { itemId, columnId } = parsed;

      let value: string | undefined;
      switch (columnId) {
        case 'date': value = editData.date; break;
        case 'merchant': value = editData.merchant; break;
        case 'amount': value = editData.amount?.toString(); break;
        case 'category': value = editData.category; break;
        case 'currency': value = editData.currency; break;
        case 'description': value = editData.description || ''; break;
        default: value = undefined;
      }

      if (value !== undefined && typeof onUpdateExpense === 'function') {
        try {
          onUpdateExpense(itemId, columnId as keyof PendingExpense, value, currentSection);
        } catch (error) {
          console.error('Error calling onUpdateExpense:', error);
        }
      }
    }
    cancelEdit();
  };

  const handleBulkDelete = () => {
    selectedExpenses.forEach(tempId => {
      onRemoveExpense(tempId, currentSection);
    });
    setSelectedExpenses(new Set());
  };

  const handleBulkChangeCategory = (newCategory: string) => {
    selectedExpenses.forEach(tempId => {
      onUpdateExpense(tempId, 'category', newCategory, currentSection);
    });
    setSelectedExpenses(new Set());
    setShowChangeCategoryDialog(false);
  };

  const handleBulkSplit = (splits: ExpenseSplit[]) => {
    selectedExpenses.forEach(tempId => {
      onUpdateExpenseSplit(tempId, splits, currentSection);
    });
    setSelectedExpenses(new Set());
    setShowSplitDialog(false);
  };

  // Get selected expenses as array for dialogs
  const selectedExpensesArray = categorizedExpenses[currentSection].filter(
    expense => selectedExpenses.has(expense.tempId)
  );

  // Column definitions for the DataTable
  const columns: ColumnDef<PendingExpense>[] = [
    {
      id: 'date',
      header: 'Date',
      sortable: true,
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
<DatePickerInput
            value={editData.date || expense.date}
            onChange={(val) => onEditDataChange({ ...editData, date: val })}
            onCommit={handleSaveCellEdit}
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block"
          >
            {new Date(expense.date).toLocaleDateString()}
          </span>
        )
      ),
    },
    {
      id: 'merchant',
      header: 'Merchant',
      sortable: true,
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Input
            value={editData.merchant || expense.merchant}
            onChange={(e) => onEditDataChange({ ...editData, merchant: e.target.value })}
            onBlur={handleSaveCellEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCellEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            placeholder="Store or service name"
            autoFocus
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block font-medium"
          >
            {expense.merchant}
          </span>
        )
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={editData.amount || expense.amount}
              onChange={(e) => onEditDataChange({ ...editData, amount: parseFloat(e.target.value) })}
              onBlur={handleSaveCellEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCellEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              placeholder="0.00"
              className="flex-1"
              autoFocus
            />
            <Select
              value={editData.currency || expense.currency}
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
            <div className="font-semibold">
              {expense.currency} {expense.amount.toFixed(2)}
            </div>
          </span>
        )
      ),
    },
    {
      id: 'category',
      header: 'Category',
      sortable: true,
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => (
        <CategorySelect
          categories={categories}
          categoryGroups={categoryGroups}
          value={expense.category}
          onValueChange={(value) => onUpdateExpense(expense.tempId, 'category', value, currentSection)}
          showBadge={true}
          triggerClassName="hover:bg-gray-100 border-none bg-transparent shadow-none"
          enableInlineCreate
          onCategoryCreated={onCategoryCreated}
        />
      ),
    },
    {
      id: 'description',
      header: 'Description',
      sortable: true,
      cell: (expense, isEditing, editData, onEditDataChange, onStartEdit) => (
        isEditing ? (
          <Textarea
            value={editData.description || expense.description || ''}
            onChange={(e) => onEditDataChange({ ...editData, description: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveCellEdit();
              }
              if (e.key === 'Escape') cancelEdit();
            }}
            placeholder="Additional notes (optional)..."
            rows={2}
            className="resize-none"
            autoFocus
          />
        ) : (
          <span 
            onClick={onStartEdit}
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block text-sm text-gray-600"
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

        return (
          <Popover>
            <PopoverTrigger asChild>
              <div className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block min-w-[100px]">
                {expense.splits && expense.splits.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {expense.splits.map((split, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {split.household_person_name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">Split</span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4 bg-white z-50" align="start">
              <ExpenseMultiSplitManager
                householdPersons={householdPersons}
                expenseAmount={expense.amount}
                expenseCurrency={expense.currency}
                splits={expense.splits || []}
                onSplitsChange={(splits) => onUpdateExpenseSplit(expense.tempId, splits, currentSection)}
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
          {currentSection === 'automaticallyDeleted' && (
            <Button
              size="sm"
              variant="ghost"
              className="text-blue-500 hover:text-blue-700"
              onClick={() => onRestoreExpense(expense.tempId)}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Expense</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove this expense from the import list?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRemoveExpense(expense.tempId, currentSection)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  // Bulk actions - empty since actions are now in the sticky bar
  const bulkActions: BulkAction[] = [];

  const renderExpenseTable = (expenses: PendingExpense[], sectionKey: keyof CategorizedExpenses, isEditable: boolean = true) => {
    const handleSectionChange = (section: keyof CategorizedExpenses) => {
      setCurrentSection(section);
      setSelectedExpenses(new Set());
      setEditingCell(null);
      setEditData({});
    };

    return (
      <DataTable
        title={`${sectionKey === 'automaticallyClassified' ? 'Auto-Classified' : 
                sectionKey === 'automaticallyDeleted' ? 'Auto-Deleted' : 
                'Needs Attention'} Expenses`}
        description={
          sectionKey === 'automaticallyClassified' ? 'These expenses were automatically categorized based on previous data.' :
          sectionKey === 'automaticallyDeleted' ? 'These expenses were automatically filtered out (Exchange/Top-up transactions).' :
          'These expenses require manual categorization.'
        }
        data={expenses}
        columns={isEditable ? columns : columns.filter(col => col.id !== 'actions')}
        keyField="tempId"
        selectedItems={sectionKey === currentSection ? selectedExpenses : new Set()}
        onSelectionChange={sectionKey === currentSection ? setSelectedExpenses : () => {}}
        bulkActions={isEditable && sectionKey === currentSection ? bulkActions : []}
        editingCell={sectionKey === currentSection ? editingCell : null}
        editData={sectionKey === currentSection ? editData : {}}
        onEditDataChange={sectionKey === currentSection ? setEditData : () => {}}
        onStartCellEdit={sectionKey === currentSection ? (itemId: string, columnId: string) => {
          handleSectionChange(sectionKey);
          handleStartCellEdit(itemId, columnId);
        } : () => {}}
        onSaveCellEdit={sectionKey === currentSection ? handleSaveCellEdit : () => {}}
        onCancelCellEdit={sectionKey === currentSection ? cancelEdit : () => {}}
      />
    );
  };

  const expensesToAdd = categorizedExpenses.automaticallyClassified.length + categorizedExpenses.needsAttention.length;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="needsAttention" onValueChange={(value) => setCurrentSection(value as keyof CategorizedExpenses)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="needsAttention" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Needs Attention ({categorizedExpenses.needsAttention.length})
          </TabsTrigger>
          <TabsTrigger value="automaticallyClassified" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Auto-Classified ({categorizedExpenses.automaticallyClassified.length})
          </TabsTrigger>
          <TabsTrigger value="automaticallyDeleted" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Auto-Deleted ({categorizedExpenses.automaticallyDeleted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="needsAttention">
          {renderExpenseTable(categorizedExpenses.needsAttention, 'needsAttention', true)}
        </TabsContent>

        <TabsContent value="automaticallyClassified">
          {renderExpenseTable(categorizedExpenses.automaticallyClassified, 'automaticallyClassified', true)}
        </TabsContent>

        <TabsContent value="automaticallyDeleted">
          {renderExpenseTable(categorizedExpenses.automaticallyDeleted, 'automaticallyDeleted', true)}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between items-center px-6 pb-6">
        <div className="text-sm text-gray-600">
          {expensesToAdd} expense{expensesToAdd !== 1 ? 's' : ''} ready to add
          {categorizedExpenses.automaticallyDeleted.length > 0 && (
            <span className="ml-2 text-gray-500">
              ({categorizedExpenses.automaticallyDeleted.length} filtered out)
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onConfirmAll} disabled={expensesToAdd === 0 || isUploading}>
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Adding Expenses...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Add All Expenses ({expensesToAdd})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      {selectedExpenses.size > 0 && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3 flex items-center justify-end gap-2">
            {householdPersons.length > 0 && (
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
                  Remove ({selectedExpenses.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Selected Expenses</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {selectedExpenses.size} selected expense(s) from the import list?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleBulkDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Remove
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

      {/* Bulk Split Dialog */}
      <BulkSplitPendingExpenseDialog
        open={showSplitDialog}
        onOpenChange={setShowSplitDialog}
        selectedExpenses={selectedExpensesArray}
        householdPersons={householdPersons}
        onBulkSplit={handleBulkSplit}
      />
    </div>
  );
};

export default ExpenseReviewSection;
