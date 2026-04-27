import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Expense, Category, CategoryGroup, ExpenseAutomationRule, ExpenseSplit } from '@/interfaces';
import FileUploadDropzone from '@/components/file-upload/FileUploadDropzone';
import ExpenseReviewSection from '@/components/file-upload/ExpenseReviewSection';
import FileFormatGuide from '@/components/file-upload/FileFormatGuide';
import ColumnMappingDialog, { ColumnMapping } from '@/components/file-upload/ColumnMappingDialog';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useHouseholdData } from '@/hooks/useHouseholdData';
import { useAutomationRules } from '@/hooks/useAutomationRules';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'file_upload_state';

interface FileUploadProps {
  onUploadExpenses: (expenses: Omit<Expense, 'id' | 'user_id'>[]) => Promise<void>;
  categories: Category[];
  categoryGroups?: CategoryGroup[];
  getMerchantCategory: (merchant: string) => string;
}

interface PendingExpense extends Omit<Expense, 'id' | 'user_id' | 'splits'> {
  tempId: string;
  splits?: ExpenseSplit[];
}

interface CategorizedExpenses {
  automaticallyClassified: PendingExpense[];
  automaticallyDeleted: PendingExpense[];
  needsAttention: PendingExpense[];
}

const FileUpload = ({ onUploadExpenses, categories, categoryGroups, getMerchantCategory }: FileUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categorizedExpenses, setCategorizedExpenses] = useState<CategorizedExpenses>({
    automaticallyClassified: [],
    automaticallyDeleted: [],
    needsAttention: []
  });
  const [merchantCategoryMap, setMerchantCategoryMap] = useState<Record<string, string>>({});
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [csvData, setCsvData] = useState<{ headers: string[]; lines: string[] } | null>(null);
  const { toast } = useToast();
  const { householdPersons, addDebtEntry } = useHouseholdData();
  const { rules } = useAutomationRules();

  // Load persisted state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setCategorizedExpenses(parsed.categorizedExpenses);
        setMerchantCategoryMap(parsed.merchantCategoryMap);
        toast({
          title: "Progress Restored",
          description: "Your previous file upload has been restored",
        });
      } catch (error) {
        console.error('Failed to restore file upload state:', error);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Persist state when it changes
  useEffect(() => {
    const hasData = categorizedExpenses.automaticallyClassified.length > 0 ||
                    categorizedExpenses.automaticallyDeleted.length > 0 ||
                    categorizedExpenses.needsAttention.length > 0;
    
    if (hasData) {
      const stateToSave = {
        categorizedExpenses,
        merchantCategoryMap,
        timestamp: Date.now()
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [categorizedExpenses, merchantCategoryMap]);

  const parseDateWithFormat = (dateStr: string, format: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Remove quotes and trim
    const cleanDateStr = dateStr.replace(/"/g, '').trim();
    
    try {
      let date: Date;
      
      // Handle different formats
      switch (format) {
        case 'DD.MM.YYYY':
        case 'DD.MM.YYYY HH:mm': {
          const [datePart] = cleanDateStr.split(' ');
          const [day, month, year] = datePart.split('.');
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          break;
        }
        case 'DD-MM-YYYY':
        case 'DD-MM-YYYY HH:mm': {
          const [datePart] = cleanDateStr.split(' ');
          const [day, month, year] = datePart.split('-');
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          break;
        }
        case 'MM-DD-YYYY':
        case 'MM-DD-YYYY HH:mm': {
          const [datePart] = cleanDateStr.split(' ');
          const [month, day, year] = datePart.split('-');
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          break;
        }
        case 'YYYY-MM-DD': {
          date = new Date(cleanDateStr);
          break;
        }
        case 'MM/DD/YYYY': {
          const [month, day, year] = cleanDateStr.split('/');
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          break;
        }
        case 'DD/MM/YYYY': {
          const [day, month, year] = cleanDateStr.split('/');
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          break;
        }
        default: {
          // Fallback to standard parsing
          date = new Date(cleanDateStr);
          break;
        }
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${cleanDateStr} with format ${format}`);
        return new Date().toISOString().split('T')[0];
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error(`Error parsing date: ${cleanDateStr} with format ${format}`, error);
      return new Date().toISOString().split('T')[0];
    }
  };

  const detectColumnIndices = (headers: string[]) => {
    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
    const merchantIndex = headers.findIndex(h => 
      h.toLowerCase().includes('merchant') || 
      h.toLowerCase().includes('store') || 
      h.toLowerCase().includes('description')
    );
    const amountIndex = headers.findIndex(h => 
      h.toLowerCase().includes('amount') || 
      h.toLowerCase().includes('price') || 
      h.toLowerCase().includes('cost')
    );
    const currencyIndex = headers.findIndex(h => h.toLowerCase().includes('currency'));
    const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'));

    return { dateIndex, merchantIndex, amountIndex, currencyIndex, categoryIndex };
  };

  const applyAutomationRules = (expense: PendingExpense, expenseCategory?: string): { shouldDelete: boolean; splitInfo?: ExpenseSplit } => {
    const activeRules = rules.filter(rule => rule.is_active);
    
    for (const rule of activeRules) {
      // Check if rule has any conditions
      const hasConditions = rule.merchant_pattern || rule.description_pattern || rule.category_id;
      if (!hasConditions) continue; // Skip rules with no conditions
      
      const matchesMerchant = rule.merchant_pattern ? 
        expense.merchant.toLowerCase().includes(rule.merchant_pattern.toLowerCase()) : true;
      
      const matchesDescription = rule.description_pattern ? 
        (expense.description || '').toLowerCase().includes(rule.description_pattern.toLowerCase()) : true;
      
      const matchesCategory = rule.category_id ? 
        (expenseCategory && categories.find(c => c.id === rule.category_id)?.name === expenseCategory) : true;
      
      // Rule applies if ALL conditions are met (treating null patterns as "no condition")
      const ruleApplies = 
        (!rule.merchant_pattern || matchesMerchant) &&
        (!rule.description_pattern || matchesDescription) &&
        (!rule.category_id || matchesCategory);
      
      if (ruleApplies) {
        if (rule.rule_type === 'delete') {
          return { shouldDelete: true };
        } else if (rule.rule_type === 'split' && rule.household_person_id && rule.split_method && rule.split_amount) {
          const householdPerson = householdPersons.find(p => p.id === rule.household_person_id);
          if (householdPerson) {
            return {
              shouldDelete: false,
              splitInfo: {
                household_person_id: rule.household_person_id,
                household_person_name: householdPerson.name,
                split_method: rule.split_method,
                split_value: rule.split_amount
              }
            };
          }
        }
      }
    }
    
    return { shouldDelete: false };
  };

  const applySplitRulesOnly = (expense: PendingExpense, expenseCategory?: string): ExpenseSplit | undefined => {
    const activeRules = rules.filter(rule => rule.is_active && rule.rule_type === 'split');
    
    for (const rule of activeRules) {
      // Check if rule has any conditions
      const hasConditions = rule.merchant_pattern || rule.description_pattern || rule.category_id;
      if (!hasConditions) continue; // Skip rules with no conditions
      
      const matchesMerchant = rule.merchant_pattern ? 
        expense.merchant.toLowerCase().includes(rule.merchant_pattern.toLowerCase()) : true;
      
      const matchesDescription = rule.description_pattern ? 
        (expense.description || '').toLowerCase().includes(rule.description_pattern.toLowerCase()) : true;
      
      const matchesCategory = rule.category_id ? 
        (expenseCategory && categories.find(c => c.id === rule.category_id)?.name === expenseCategory) : true;
      
      // Rule applies if ALL conditions are met (treating null patterns as "no condition")
      const ruleApplies = 
        (!rule.merchant_pattern || matchesMerchant) &&
        (!rule.description_pattern || matchesDescription) &&
        (!rule.category_id || matchesCategory);
      
      if (ruleApplies && rule.household_person_id && rule.split_method && rule.split_amount) {
        const householdPerson = householdPersons.find(p => p.id === rule.household_person_id);
        if (householdPerson) {
          return {
            household_person_id: rule.household_person_id,
            household_person_name: householdPerson.name,
            split_method: rule.split_method,
            split_value: rule.split_amount,
          };
        }
      }
    }
    
    return undefined;
  };

  // Proper CSV parsing function that handles quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Push the last field
    result.push(current.trim());
    return result;
  };

  const processExpensesWithMapping = async (mapping: ColumnMapping, headers: string[], lines: string[], dateFormat: string) => {
    const rawExpenses: PendingExpense[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 3) continue;
      
      const dateStr = values[mapping.date];
      const merchant = values[mapping.merchant];
      const amount = Math.abs(parseFloat(values[mapping.amount]));
      const currency = mapping.currency !== undefined ? values[mapping.currency] : 'USD';

      if (dateStr && merchant && !isNaN(amount)) {
        const parsedDate = parseDateWithFormat(dateStr, dateFormat);
        
        rawExpenses.push({
          tempId: `temp-${i}`,
          date: parsedDate,
          merchant,
          amount,
          category: 'Other', // Will be set later
          currency,
          description: '',
        });
      }
    }
    
    // Categorize expenses
    const automaticallyDeleted: PendingExpense[] = [];
    const automaticallyClassified: PendingExpense[] = [];
    const needsAttention: PendingExpense[] = [];
    
    for (const expense of rawExpenses) {
      // First, try to get category from existing expenses
      const existingCategory = getMerchantCategory(expense.merchant);
      const finalCategory = existingCategory !== 'Other' ? existingCategory : expense.category;
      
      // Apply automation rules with the determined category
      const { shouldDelete, splitInfo } = applyAutomationRules(expense, finalCategory);
      
      if (shouldDelete) {
        automaticallyDeleted.push(expense);
        continue;
      }
      
      // Add split info if rule applied (wrap in array for splits)
      if (splitInfo) {
        expense.splits = [splitInfo];
      }
      
      // Categorize the expense
      if (existingCategory !== 'Other') {
        automaticallyClassified.push({
          ...expense,
          category: existingCategory
        });
      } else {
        needsAttention.push(expense);
      }
    }
    
    return {
      automaticallyClassified,
      automaticallyDeleted,
      needsAttention
    };
  };
  
  const processCSVFile = async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('File must contain at least a header row and one data row');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const { dateIndex, merchantIndex, amountIndex, currencyIndex, categoryIndex } = detectColumnIndices(headers);

        // Check if all required columns are detected
        if (dateIndex === -1 || merchantIndex === -1 || amountIndex === -1) {
          // Show column mapping dialog
          setCsvData({ headers: lines[0].split(',').map(h => h.trim()), lines });
          setShowColumnMapping(true);
          setIsProcessing(false);
          return;
        }
        
        // Process with automatic detection - use default date format
        const mapping: ColumnMapping = {
          date: dateIndex,
          merchant: merchantIndex,
          amount: amountIndex,
          currency: currencyIndex !== -1 ? currencyIndex : undefined,
          category: categoryIndex !== -1 ? categoryIndex : undefined
        };
        
        const categorizedExpenses = await processExpensesWithMapping(mapping, headers, lines, 'YYYY-MM-DD');
        
        const totalExpenses = categorizedExpenses.automaticallyClassified.length + 
                             categorizedExpenses.automaticallyDeleted.length + 
                             categorizedExpenses.needsAttention.length;
        
        if (totalExpenses === 0) {
          throw new Error('No valid expenses found in file');
        }
        
        setCategorizedExpenses(categorizedExpenses);
        toast({
          title: "File Processed Successfully",
          description: `Found ${totalExpenses} expenses. ${categorizedExpenses.automaticallyClassified.length} auto-classified, ${categorizedExpenses.automaticallyDeleted.length} auto-deleted, ${categorizedExpenses.needsAttention.length} need attention.`,
        });
        
      } catch (error) {
        toast({
          title: "Upload Error",
          description: error instanceof Error ? error.message : "Failed to process file",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.readAsText(file);
  };

  const handleColumnMappingComplete = async (mapping: ColumnMapping, dateFormat: string) => {
    if (!csvData) return;
    
    try {
      const categorizedExpenses = await processExpensesWithMapping(mapping, csvData.headers, csvData.lines, dateFormat);
      
      const totalExpenses = categorizedExpenses.automaticallyClassified.length + 
                           categorizedExpenses.automaticallyDeleted.length + 
                           categorizedExpenses.needsAttention.length;
      
      if (totalExpenses === 0) {
        throw new Error('No valid expenses found in file');
      }
      
      setCategorizedExpenses(categorizedExpenses);
      setShowColumnMapping(false);
      setCsvData(null);
      
      toast({
        title: "File Processed Successfully",
        description: `Found ${totalExpenses} expenses. ${categorizedExpenses.automaticallyClassified.length} auto-classified, ${categorizedExpenses.automaticallyDeleted.length} auto-deleted, ${categorizedExpenses.needsAttention.length} need attention.`,
      });
      
    } catch (error) {
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "Failed to process file with mapping",
        variant: "destructive",
      });
    }
  };

  const handleColumnMappingCancel = () => {
    setShowColumnMapping(false);
    setCsvData(null);
    toast({
      title: "Upload Cancelled",
      description: "Column mapping was cancelled",
    });
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }
    
    processCSVFile(file);
  };

  const updateCategorizedExpense = (tempId: string, field: keyof PendingExpense, value: string, section: keyof CategorizedExpenses) => {
    setCategorizedExpenses(prev => {
      const updated = { ...prev };
      updated[section] = updated[section].map(expense => {
        if (expense.tempId === tempId) {
          // Convert amount back to number to prevent toFixed() errors
          const updatedValue = field === 'amount' ? parseFloat(value) : value;
          const updatedExpense = { ...expense, [field]: updatedValue };
          
          // Check for split automation rules when category or merchant changes
          if (field === 'category' || field === 'merchant') {
            const categoryToCheck = field === 'category' ? value : expense.category;
            const splitInfo = applySplitRulesOnly(updatedExpense, categoryToCheck);
            if (splitInfo) {
              updatedExpense.splits = [splitInfo];
            }
          }
          
          return updatedExpense;
        }
        return expense;
      });
      return updated;
    });

    // If category is being updated, update the merchant category map
    if (field === 'category') {
      const expense = categorizedExpenses[section].find(e => e.tempId === tempId);
      if (expense) {
        const newMap = { ...merchantCategoryMap, [expense.merchant]: value };
        setMerchantCategoryMap(newMap);

        // Apply this category to other expenses with the same merchant that don't have a category set
        setCategorizedExpenses(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            const sectionKey = key as keyof CategorizedExpenses;
            updated[sectionKey] = updated[sectionKey].map(exp => {
              if (exp.merchant === expense.merchant && exp.category === 'Other') {
                const updatedExp = { ...exp, category: value };
                // Also check for split rules on matching expenses
                const splitInfo = applySplitRulesOnly(updatedExp, value);
                if (splitInfo) {
                  updatedExp.splits = [splitInfo];
                }
                return updatedExp;
              }
              return exp;
            });
          });
          return updated;
        });
      }
    }
  };

  const removeCategorizedExpense = (tempId: string, section: keyof CategorizedExpenses) => {
    setCategorizedExpenses(prev => ({
      ...prev,
      [section]: prev[section].filter(expense => expense.tempId !== tempId)
    }));
    toast({
      title: "Expense Removed",
      description: "The expense has been removed from the upload batch",
    });
  };

  const restoreExpense = (tempId: string) => {
    const expense = categorizedExpenses.automaticallyDeleted.find(e => e.tempId === tempId);
    if (!expense) return;

    // Check if merchant exists in user's expenses
    const existingCategory = getMerchantCategory(expense.merchant);
    
    setCategorizedExpenses(prev => {
      const updatedExpense = existingCategory !== 'Other' ? { ...expense, category: existingCategory } : expense;
      const targetSection = existingCategory !== 'Other' ? 'automaticallyClassified' : 'needsAttention';
      
      return {
        ...prev,
        automaticallyDeleted: prev.automaticallyDeleted.filter(e => e.tempId !== tempId),
        [targetSection]: [...prev[targetSection], updatedExpense]
      };
    });

    toast({
      title: "Expense Restored",
      description: `Expense moved to ${existingCategory !== 'Other' ? 'auto-classified' : 'needs attention'} section`,
    });
  };

  const updateExpenseSplit = (tempId: string, splits: ExpenseSplit[], section: keyof CategorizedExpenses) => {
    setCategorizedExpenses(prev => {
      const updated = { ...prev };
      updated[section] = updated[section].map(expense => {
        if (expense.tempId === tempId) {
          return { ...expense, splits };
        }
        return expense;
      });
      return updated;
    });
  };

  const confirmAllExpenses = async () => {
    const expensesWithSplits = [
      ...categorizedExpenses.automaticallyClassified,
      ...categorizedExpenses.needsAttention
    ];
    
    // Convert to expenses including split information
    const expensesToAdd = expensesWithSplits.map(({ tempId, ...expense }) => expense);
    
    setIsUploading(true);
    
    try {
      // Add the expenses with split information
      await onUploadExpenses(expensesToAdd);
      
      setCategorizedExpenses({
        automaticallyClassified: [],
        automaticallyDeleted: [],
        needsAttention: []
      });
      setMerchantCategoryMap({});
      sessionStorage.removeItem(STORAGE_KEY);
      toast({
        title: "Expenses Added Successfully",
        description: `Added ${expensesToAdd.length} expenses to your account${
          expensesWithSplits.some(e => e.splits && e.splits.length > 0) ? ' with splits' : ''
        }`,
      });
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to add some expenses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    setCategorizedExpenses({
      automaticallyClassified: [],
      automaticallyDeleted: [],
      needsAttention: []
    });
    setMerchantCategoryMap({});
    sessionStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Upload Cancelled",
      description: "No expenses were added",
    });
  };

  if (showColumnMapping && csvData) {
    return (
      <ColumnMappingDialog
        headers={csvData.headers}
        csvData={csvData.lines}
        onMappingComplete={handleColumnMappingComplete}
        onCancel={handleColumnMappingCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          💡 <strong>Tip:</strong> Save time by setting up automation rules to automatically categorize or split expenses during uploads. 
          <Link to="/settings#automation-rules" className="text-blue-600 hover:text-blue-800 underline ml-1">
            Configure automation rules in Settings
          </Link>
        </p>
      </div>
      
      <FileUploadDropzone 
        onFileSelect={handleFileSelect}
        isProcessing={isProcessing}
      />

      <ExpenseReviewSection
        categorizedExpenses={categorizedExpenses}
        categories={categories}
        categoryGroups={categoryGroups}
        householdPersons={householdPersons}
        onUpdateExpense={updateCategorizedExpense}
        onUpdateExpenseSplit={updateExpenseSplit}
        onRemoveExpense={removeCategorizedExpense}
        onRestoreExpense={restoreExpense}
        onConfirmAll={confirmAllExpenses}
        onCancel={cancelUpload}
        isUploading={isUploading}
      />

      <FileFormatGuide />
    </div>
  );
};

export default FileUpload;
