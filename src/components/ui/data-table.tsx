
import { ReactNode, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Plus, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import DatePickerInput from '@/components/DatePickerInput';

export interface ColumnDef<T> {
  id: string;
  header: string | ReactNode;
  cell: (item: T, isEditing: boolean, editData: any, onEditDataChange: (data: any) => void, onStartEdit?: () => void, onSave?: () => void, onCancel?: () => void) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date' | 'number';
  filterOptions?: { label: string; value: string }[];
  filterComponent?: (value: any, onChange: (value: any) => void) => ReactNode;
  width?: string;
}

export interface FilterControl {
  id: string;
  component: ReactNode;
}

export interface ActiveFilter {
  columnId: string;
  label: string;
  value: any;
}

export interface BulkAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  action: (selectedIds: Set<string>) => void;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps<T> {
  title: string;
  description: string;
  data: T[];
  columns: ColumnDef<T>[];
  keyField: keyof T;
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  bulkActions?: BulkAction[];
  onAddNew?: () => void;
  addNewLabel?: string;
  onUpload?: () => void;
  uploadLabel?: string;
  filterControls?: FilterControl[];
  onClearFilters?: () => void;
  editingCell?: string | null;
  editData?: any;
  onEditDataChange?: (data: any) => void;
  onStartCellEdit?: (itemId: string, columnId: string) => void;
  onSaveCellEdit?: () => void;
  onCancelCellEdit?: () => void;
  newRowComponent?: ReactNode;
  showNewRow?: boolean;
  emptyState?: ReactNode;
  className?: string;
  filters?: Record<string, any>;
  onFiltersChange?: (filters: Record<string, any>) => void;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  title,
  description,
  data,
  columns,
  keyField,
  selectedItems = new Set(),
  onSelectionChange,
  bulkActions = [],
  onAddNew,
  addNewLabel = "Add New",
  onUpload,
  uploadLabel = "Upload",
  filterControls = [],
  onClearFilters,
  editingCell,
  editData,
  onEditDataChange,
  onStartCellEdit,
  onSaveCellEdit,
  onCancelCellEdit,
  newRowComponent,
  showNewRow = false,
  emptyState,
  className,
  filters = {},
  onFiltersChange,
  onRowClick,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const hasSelection = onSelectionChange && selectedItems;
  const allSelected = data.length > 0 && hasSelection && selectedItems.size === data.length;
  const someSelected = hasSelection && selectedItems.size > 0;

  const handleFilterChange = (columnId: string, value: any) => {
    if (!onFiltersChange) return;
    const newFilters = { ...filters };
    if (value === '' || value === null || value === undefined || value === 'all') {
      delete newFilters[columnId];
    } else {
      newFilters[columnId] = value;
    }
    onFiltersChange(newFilters);
  };

  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable) return;

    setSortConfig(prevSort => {
      if (prevSort?.column === columnId) {
        // Toggle direction or clear sort
        if (prevSort.direction === 'asc') {
          return { column: columnId, direction: 'desc' };
        } else if (prevSort.direction === 'desc') {
          return null; // Clear sort
        }
      }
      return { column: columnId, direction: 'asc' };
    });
  };

  const getSortIcon = (columnId: string) => {
    if (!sortConfig || sortConfig.column !== columnId) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  const sortData = (data: T[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

      // Handle different data types
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        // Convert to string for comparison
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  const clearFilter = (columnId: string) => {
    handleFilterChange(columnId, null);
  };

  const clearAllFilters = () => {
    if (onFiltersChange) {
      onFiltersChange({});
    }
    if (onClearFilters) {
      onClearFilters();
    }
  };

  const getActiveFilters = (): ActiveFilter[] => {
    return Object.entries(filters).map(([columnId, value]) => {
      const column = columns.find(col => col.id === columnId);
      let displayValue = value;
      
      // For select filters, try to find the display label
      if (column?.filterType === 'select' && column.filterOptions) {
        const option = column.filterOptions.find(opt => opt.value === value);
        if (option) {
          displayValue = option.label;
        }
      }
      
      return {
        columnId,
        label: typeof column?.header === 'string' ? column.header : columnId,
        value: displayValue,
      };
    });
  };

  const renderFilterControl = (column: ColumnDef<T>) => {
    if (!column.filterable) return null;

    // Use custom filter component if provided
    if (column.filterComponent) {
      const currentValue = filters[column.id] || '';
      return column.filterComponent(currentValue, (value) => handleFilterChange(column.id, value));
    }

    const currentFilter = column.filterType === 'select' 
      ? (filters[column.id] || 'all')
      : (filters[column.id] || '');

    switch (column.filterType) {
      case 'select':
        return (
          <Select value={currentFilter} onValueChange={(value) => handleFilterChange(column.id, value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {column.filterOptions?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
<DatePickerInput
            value={currentFilter}
            onChange={(val) => handleFilterChange(column.id, val)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={currentFilter}
            onChange={(e) => handleFilterChange(column.id, e.target.value)}
            placeholder="Filter amount"
          />
        );
      default:
        return (
          <Input
            value={currentFilter}
            onChange={(e) => handleFilterChange(column.id, e.target.value)}
            placeholder={`Filter ${typeof column.header === 'string' ? column.header.toLowerCase() : 'column'}`}
          />
        );
    }
  };

  const activeFilters = getActiveFilters();
  const sortedData = sortData(data);

  const handleSelectAll = (checked: boolean | string) => {
    if (!hasSelection || !onSelectionChange) return;
    
    const isChecked = checked === true;
    if (isChecked) {
      onSelectionChange(new Set(sortedData.map(item => String(item[keyField]))));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean | string) => {
    if (!hasSelection || !onSelectionChange) return;
    
    const isChecked = checked === true;
    const newSelected = new Set(selectedItems);
    if (isChecked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    onSelectionChange(newSelected);
  };

  // Show empty state if no data and no new row
  if (sortedData.length === 0 && !showNewRow) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {emptyState || (
            <div className="p-8 text-center text-gray-500">
              <p>No records yet.</p>
              <div className="flex justify-center gap-2 mt-4">
                {onAddNew && (
                  <Button onClick={onAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    {addNewLabel}
                  </Button>
                )}
                {onUpload && (
                  <Button onClick={onUpload} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    {uploadLabel}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onClearFilters && (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                Clear Filters
              </Button>
            )}
            {onUpload && (
              <Button onClick={onUpload} variant="outline" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {uploadLabel}
              </Button>
            )}
            {onAddNew && (
              <Button onClick={onAddNew} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {addNewLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {activeFilters.map((filter) => (
              <Badge key={filter.columnId} variant="secondary" className="flex items-center gap-1">
                {filter.label}: {filter.value}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => clearFilter(filter.columnId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Bulk Actions */}
        {someSelected && bulkActions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedItems.size} selected
            </span>
            {bulkActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={() => action.action(selectedItems)}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.id} className={column.width}>
                  <div className="flex items-center gap-2">
                    {column.header}
                    <div className="flex items-center gap-1">
                      {column.sortable && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleSort(column.id)}
                        >
                          {getSortIcon(column.id)}
                        </Button>
                      )}
                      {column.filterable && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Filter className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="start">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Filter {typeof column.header === 'string' ? column.header : 'Column'}</h4>
                              {renderFilterControl(column)}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* New Row */}
            {showNewRow && newRowComponent}

            {/* Data Rows */}
            {sortedData.map((item) => {
              const itemId = String(item[keyField]);
              const isSelected = hasSelection && selectedItems.has(itemId);

              return (
                <TableRow 
                  key={itemId}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={onRowClick ? 'cursor-pointer hover:bg-accent/40' : undefined}
                >
                  {hasSelection && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(itemId, checked)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const cellId = `${itemId}-${column.id}`;
                    const isCellEditing = editingCell === cellId;
                    
                    const handleStartEdit = () => {
                      if (onStartCellEdit) {
                        onStartCellEdit(itemId, column.id);
                      }
                    };

                    return (
                      <TableCell key={column.id}>
                        {column.cell(
                          item, 
                          isCellEditing, 
                          editData, 
                          onEditDataChange || (() => {}),
                          handleStartEdit,
                          onSaveCellEdit,
                          onCancelCellEdit
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
