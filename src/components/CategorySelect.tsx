import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Category, CategoryGroup } from '@/interfaces';
import { cn } from '@/lib/utils';

interface CategorySelectProps {
  categories: Category[];
  categoryGroups?: CategoryGroup[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  showBadge?: boolean;
  showAllOption?: boolean;
}

const CategorySelect = ({
  categories,
  categoryGroups,
  value,
  onValueChange,
  placeholder = "Select a category",
  className,
  triggerClassName,
  showBadge = false,
  showAllOption = false,
}: CategorySelectProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Auto-expand the group containing the selected category
  useEffect(() => {
    if (value && categoryGroups) {
      const groupWithValue = categoryGroups.find(g => 
        g.categories.some(c => c.name === value)
      );
      if (groupWithValue && !expandedGroups.has(groupWithValue.id)) {
        setExpandedGroups(prev => new Set([...prev, groupWithValue.id]));
      }
    }
  }, [value, categoryGroups]);

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

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6b7280';
  };

  const hasGroups = categoryGroups && categoryGroups.length > 0;

  const renderTriggerContent = () => {
    if (!value) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    const color = getCategoryColor(value);

    if (showBadge) {
      return (
        <Badge 
          variant="outline" 
          className="border-2"
          style={{ 
            borderColor: color,
            color: color,
            backgroundColor: `${color}10`
          }}
        >
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: color }}
            />
            {value}
          </div>
        </Badge>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: color }}
        />
        {value}
      </div>
    );
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn(triggerClassName, className)}>
        <SelectValue placeholder={placeholder}>
          {renderTriggerContent()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background z-50 max-h-[300px]">
        {showAllOption && (
          <SelectItem value="__all__">
            <span className="text-muted-foreground">All categories</span>
          </SelectItem>
        )}
        {hasGroups ? (
          // Grouped view
          categoryGroups.map(group => (
            <div key={group.id}>
              {/* Group Header */}
              <div
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm select-none"
                onClick={(e) => toggleGroup(group.id, e)}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: group.color }}
                />
                <span className="font-medium flex-1 text-sm">{group.name}</span>
                <span className="text-xs text-muted-foreground mr-1">
                  ({group.categories.length})
                </span>
                {expandedGroups.has(group.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Categories */}
              {expandedGroups.has(group.id) && group.categories.map(category => (
                <SelectItem 
                  key={category.id} 
                  value={category.name} 
                  className="pl-6"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))
        ) : (
          // Flat view (fallback)
          categories.map(category => (
            <SelectItem key={category.id} value={category.name}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};

export default CategorySelect;
