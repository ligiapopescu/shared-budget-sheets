import { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Plus, Check, X, Loader2 } from 'lucide-react';
import { Category, CategoryGroup } from '@/interfaces';
import { cn } from '@/lib/utils';
import { useAddHouseholdCategory } from '@/hooks/useAddHouseholdCategory';
import { useToast } from '@/hooks/use-toast';

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
  // When true and the user is in a household, each expanded group gets a
  // "+ Add subcategory" affordance for creating a new household_category
  // inline. After a successful create, `onCategoryCreated` (if provided)
  // is called so the parent can refresh its derived `categoryGroups`.
  enableInlineCreate?: boolean;
  onCategoryCreated?: () => void;
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
  enableInlineCreate = false,
  onCategoryCreated,
}: CategorySelectProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Which group's "Add subcategory" input is currently open. Only one at a
  // time keeps the UX simple and avoids ambiguity around which input has
  // focus inside the popover.
  const [creatingInGroup, setCreatingInGroup] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Mutation-only — does NOT fetch on mount, so it's safe to use inside
  // a component that may be rendered hundreds of times on a single page.
  const { addCategory } = useAddHouseholdCategory();
  const { toast } = useToast();

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

  // Focus the input when entering create mode.
  useEffect(() => {
    if (creatingInGroup) inputRef.current?.focus();
  }, [creatingInGroup]);

  const resetCreateState = () => {
    setCreatingInGroup(null);
    setNewName('');
    setSaving(false);
  };

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

  const startCreating = (groupId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCreatingInGroup(groupId);
    setNewName('');
  };

  const submitNew = async (group: CategoryGroup) => {
    const name = newName.trim();
    if (!name || !group.household_id || saving) return;
    // Don't allow duplicates within the same group (case-insensitive).
    const existsInGroup = group.categories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (existsInGroup) {
      toast({ title: 'Already exists', description: `"${name}" is already a subcategory of ${group.name}.`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await addCategory({
        household_id: group.household_id,
        name,
        // Inherit the group's colour so the new pill matches its siblings.
        color: group.color,
        is_default: false,
        group_id: group.id,
      });
      onCategoryCreated?.();
      onValueChange(name);
      resetCreateState();
    } catch (e) {
      console.error('Failed to add subcategory:', e);
      setSaving(false);
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6b7280';
  };

  const hasGroups = categoryGroups && categoryGroups.length > 0;
  // Inline-create only makes sense when we have actual household groups
  // (which is where the new subcategory would be filed). Each group
  // carries its own household_id so we can write the row without doing
  // an extra lookup per CategorySelect instance.
  const showCreateUI = enableInlineCreate && hasGroups && categoryGroups!.some(g => !!g.household_id);

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
    <Select
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => { if (!open) resetCreateState(); }}
    >
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

              {/* Inline create row */}
              {expandedGroups.has(group.id) && showCreateUI && (
                creatingInGroup === group.id ? (
                  <div
                    className="flex items-center gap-1 pl-6 pr-2 py-1.5"
                    // Stop the keyboard events from being intercepted by
                    // Radix Select's typeahead navigation.
                    onKeyDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <Input
                      ref={inputRef}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="New subcategory"
                      className="h-7 text-sm flex-1"
                      disabled={saving}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); submitNew(group); }
                        if (e.key === 'Escape') { e.preventDefault(); resetCreateState(); }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={saving || !newName.trim()}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); submitNew(group); }}
                      aria-label="Save subcategory"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={saving}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetCreateState(); }}
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 pl-6 pr-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm select-none text-sm text-muted-foreground"
                    onClick={(e) => startCreating(group.id, e)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add subcategory</span>
                  </div>
                )
              )}
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
