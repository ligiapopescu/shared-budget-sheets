import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2, Save, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HouseholdCategoryGroup } from '@/interfaces/household-category-groups';
import { HouseholdCategory } from '@/interfaces/household-categories';
import IconPicker, { getIconComponent } from './IconPicker';

const colorOptions = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Orange', value: '#f97316' }
];

interface CategoryGroupItemProps {
  group: HouseholdCategoryGroup;
  categories: HouseholdCategory[];
  onUpdateGroup: (id: string, data: Partial<Pick<HouseholdCategoryGroup, 'name' | 'color' | 'icon'>>) => Promise<any>;
  onDeleteGroup: (id: string) => Promise<boolean>;
  onAddCategory: (groupId: string) => void;
  onEditCategory: (category: HouseholdCategory) => void;
  onDeleteCategory: (category: HouseholdCategory) => void;
}

const CategoryGroupItem = ({
  group,
  categories,
  onUpdateGroup,
  onDeleteGroup,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryGroupItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editColor, setEditColor] = useState(group.color);
  const [editIcon, setEditIcon] = useState(group.icon);
  const [isDeleting, setIsDeleting] = useState(false);

  const IconComponent = getIconComponent(group.icon);
  const groupCategories = categories.filter(cat => cat.group_id === group.id);

  const handleSaveEdit = async () => {
    if (editName.trim()) {
      await onUpdateGroup(group.id, {
        name: editName.trim(),
        color: editColor,
        icon: editIcon,
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(group.name);
    setEditColor(group.color);
    setEditIcon(group.icon);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (groupCategories.length > 0) {
      return; // Can't delete group with categories
    }
    setIsDeleting(true);
    await onDeleteGroup(group.id);
    setIsDeleting(false);
  };

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <IconPicker
            selectedIcon={editIcon}
            onIconChange={setEditIcon}
            color={editColor}
          />
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1"
            placeholder="Group name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') handleCancelEdit();
            }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Color:</span>
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                className={`w-6 h-6 rounded-full border-2 ${
                  editColor === color.value ? 'border-foreground' : 'border-muted'
                }`}
                style={{ backgroundColor: color.value }}
                onClick={() => setEditColor(color.value)}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSaveEdit}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg">
        <div className="flex items-center justify-between p-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-3 flex-1 text-left hover:bg-muted/50 rounded p-1 -m-1">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <IconComponent className="w-5 h-5" style={{ color: group.color }} />
              <span className="font-medium">{group.name}</span>
              <span className="text-sm text-muted-foreground">
                ({groupCategories.length} {groupCategories.length === 1 ? 'category' : 'categories'})
              </span>
            </button>
          </CollapsibleTrigger>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              title="Edit group"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={groupCategories.length > 0 || isDeleting}
              title={groupCategories.length > 0 ? "Move all categories first" : "Delete group"}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t px-3 py-2 space-y-2 bg-muted/30">
            {groupCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">
                No categories in this group
              </p>
            ) : (
              groupCategories.map((category) => (
                <div 
                  key={category.id} 
                  className="flex items-center justify-between py-2 px-3 bg-background rounded border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditCategory(category)}
                      title="Edit category"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteCategory(category)}
                      title="Delete category"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
            
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              onClick={() => onAddCategory(group.id)}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Category
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default CategoryGroupItem;
