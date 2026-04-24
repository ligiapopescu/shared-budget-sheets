import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Tag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category, CategoryGroup } from '@/interfaces';
import { cn } from '@/lib/utils';

interface CategoryGroupSelectProps {
  categories: Category[];
  categoryGroups: CategoryGroup[];
  value: string;
  selectionType: 'category' | 'group' | '';
  onValueChange: (value: string, type: 'category' | 'group') => void;
  placeholder?: string;
  className?: string;
}

export const CategoryGroupSelect = ({
  categories,
  categoryGroups,
  value,
  selectionType,
  onValueChange,
  placeholder = "Select category or group",
  className,
}: CategoryGroupSelectProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSelectGroup = (groupId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(groupId, 'group');
    setIsOpen(false);
  };

  const handleSelectCategory = (categoryId: string) => {
    onValueChange(categoryId, 'category');
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return null;
    
    if (selectionType === 'group') {
      const group = categoryGroups.find(g => g.id === value);
      if (group) {
        return (
          <span className="flex items-center gap-2">
            <Folder className="w-4 h-4" style={{ color: group.color }} />
            <span>{group.name}</span>
            <span className="text-muted-foreground text-xs">(Group)</span>
          </span>
        );
      }
    } else if (selectionType === 'category') {
      const category = categories.find(c => c.id === value);
      if (category) {
        return (
          <span className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span>{category.name}</span>
          </span>
        );
      }
    }
    return null;
  };

  // Get categories that are not in any group
  const ungroupedCategories = categories.filter(c => !c.group_id);

  return (
    <Select 
      open={isOpen} 
      onOpenChange={setIsOpen}
      value={value ? `${selectionType}:${value}` : ''}
      onValueChange={(val) => {
        // This is for the clear option
        if (val === '__clear__') {
          onValueChange('', 'category');
          setIsOpen(false);
        }
      }}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {getDisplayValue()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background z-50 max-h-[300px]">
        {/* Clear option */}
        <SelectItem value="__clear__">
          <span className="text-muted-foreground">No category filter</span>
        </SelectItem>

        {/* Category Groups */}
        {categoryGroups.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          const groupCategories = group.categories || [];
          
          return (
            <div key={group.id}>
              {/* Group header - clickable to select */}
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm",
                  selectionType === 'group' && value === group.id && "bg-accent"
                )}
              >
                {/* Expand/collapse button */}
                <button
                  type="button"
                  onClick={(e) => toggleGroup(group.id, e)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                
                {/* Group name - clickable to select the group */}
                <div
                  className="flex items-center gap-2 flex-1"
                  onClick={(e) => handleSelectGroup(group.id, e)}
                >
                  <Folder className="w-4 h-4" style={{ color: group.color }} />
                  <span className="font-medium">{group.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({groupCategories.length} categories)
                  </span>
                </div>
              </div>

              {/* Expanded categories */}
              {isExpanded && groupCategories.length > 0 && (
                <div className="ml-6 border-l-2 border-muted pl-2">
                  {groupCategories.map(category => (
                    <div
                      key={category.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm",
                        selectionType === 'category' && value === category.id && "bg-accent"
                      )}
                      onClick={() => handleSelectCategory(category.id)}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped categories */}
        {ungroupedCategories.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
              Other Categories
            </div>
            {ungroupedCategories.map(category => (
              <div
                key={category.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm",
                  selectionType === 'category' && value === category.id && "bg-accent"
                )}
                onClick={() => handleSelectCategory(category.id)}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
              </div>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
};
