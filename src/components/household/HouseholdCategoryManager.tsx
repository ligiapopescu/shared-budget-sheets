import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useHouseholdCategories } from '@/hooks/useHouseholdCategories';
import { useHouseholdCategoryGroups } from '@/hooks/useHouseholdCategoryGroups';
import { useHouseholdStatus } from '@/hooks/useHouseholdStatus';
import { HouseholdCategory } from '@/interfaces/household-categories';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CategoryGroupItem from '@/components/household/CategoryGroupItem';
import IconPicker from '@/components/household/IconPicker';

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

const HouseholdCategoryManager = () => {
  const { categories, loading: categoriesLoading, addCategory, updateCategory, deleteCategory, refreshCategories } = useHouseholdCategories();
  const { groups, loading: groupsLoading, addGroup, updateGroup, deleteGroup, refreshGroups } = useHouseholdCategoryGroups();
  const { householdId } = useHouseholdStatus();
  const { sheetsService } = useAuth();
  const { toast } = useToast();

  // Group dialog states
  const [showAddGroupDialog, setShowAddGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6b7280');
  const [newGroupIcon, setNewGroupIcon] = useState('folder');

  // Category dialog states
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6b7280');

  // Edit category dialog states
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HouseholdCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#6b7280');
  const [editCategoryGroupId, setEditCategoryGroupId] = useState<string>('');
  
  // Deletion and migration states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<HouseholdCategory | null>(null);
  const [expenseCount, setExpenseCount] = useState(0);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationTargetId, setMigrationTargetId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loading = categoriesLoading || groupsLoading;

  const handleAddGroup = async () => {
    if (newGroupName.trim()) {
      await addGroup({
        name: newGroupName.trim(),
        color: newGroupColor,
        icon: newGroupIcon,
      });
      setNewGroupName('');
      setNewGroupColor('#6b7280');
      setNewGroupIcon('folder');
      setShowAddGroupDialog(false);
    }
  };

  const handleOpenAddCategory = (groupId: string) => {
    setSelectedGroupId(groupId);
    setNewCategoryName('');
    setNewCategoryColor('#6b7280');
    setShowAddCategoryDialog(true);
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim() && householdId && selectedGroupId) {
      await addCategory({
        household_id: householdId,
        name: newCategoryName.trim(),
        color: newCategoryColor,
        is_default: false,
        group_id: selectedGroupId,
      });
      setNewCategoryName('');
      setNewCategoryColor('#6b7280');
      setSelectedGroupId(null);
      setShowAddCategoryDialog(false);
    }
  };

  const handleOpenEditCategory = (category: HouseholdCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color);
    setEditCategoryGroupId(category.group_id || '');
    setShowEditCategoryDialog(true);
  };

  const handleSaveEditCategory = async () => {
    if (editingCategory && editCategoryName.trim()) {
      await updateCategory(editingCategory.id, {
        name: editCategoryName.trim(),
        color: editCategoryColor,
        group_id: editCategoryGroupId || null,
      });
      setEditingCategory(null);
      setShowEditCategoryDialog(false);
    }
  };

  const handleDeleteCategory = async (category: HouseholdCategory) => {
    setCategoryToDelete(category);
    
    try {
      const count = sheetsService
        ? (await sheetsService.getWhere('expenses', 'category_id', category.id, r => r)).length
        : 0;
      setExpenseCount(count);
      
      if (count > 0) {
        setShowMigrationDialog(true);
      } else {
        setShowDeleteDialog(true);
      }
    } catch (error) {
      console.error('Error checking category usage:', error);
      toast({
        title: "Error",
        description: "Failed to check category usage",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
      setExpenseCount(0);
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMigrateAndDelete = async () => {
    if (!categoryToDelete || !migrationTargetId) return;
    
    setIsDeleting(true);
    try {
      const targetCategory = categories.find(c => c.id === migrationTargetId);
      if (!targetCategory) {
        toast({
          title: "Error",
          description: "Target category not found",
          variant: "destructive",
        });
        return;
      }

      if (!sheetsService) throw new Error('Not connected');
      // Migrate expenses from old category to new
      const toMigrate = await sheetsService.getWhere('expenses', 'category_id', categoryToDelete.id, r => r);
      await Promise.all(toMigrate.map(r => sheetsService.updateById('expenses', r[0], { category_id: migrationTargetId })));
      await deleteCategory(categoryToDelete.id);

      toast({
        title: "Success",
        description: `Migrated ${expenseCount} expenses to "${targetCategory.name}" and deleted the old category`,
      });

      setShowMigrationDialog(false);
      setCategoryToDelete(null);
      setMigrationTargetId('');
      setExpenseCount(0);
    } catch (error) {
      console.error('Error migrating expenses:', error);
      toast({
        title: "Error",
        description: "Failed to migrate expenses and delete category",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setShowMigrationDialog(false);
    setCategoryToDelete(null);
    setMigrationTargetId('');
    setExpenseCount(0);
  };

  if (loading) {
    return <div className="text-center py-4">Loading household categories...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Household Categories</CardTitle>
          <Button size="sm" onClick={() => setShowAddGroupDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Group
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No category groups yet. Add one to get started!
            </p>
          ) : (
            groups.map((group) => (
              <CategoryGroupItem
                key={group.id}
                group={group}
                categories={categories}
                onUpdateGroup={updateGroup}
                onDeleteGroup={deleteGroup}
                onAddCategory={handleOpenAddCategory}
                onEditCategory={handleOpenEditCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            ))
          )}
        </div>
      </CardContent>

      {/* Add Group Dialog */}
      <Dialog open={showAddGroupDialog} onOpenChange={setShowAddGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category Group</DialogTitle>
            <DialogDescription>
              Create a new group to organize your household categories.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <IconPicker
                selectedIcon={newGroupIcon}
                onIconChange={setNewGroupIcon}
                color={newGroupColor}
              />
              <div className="flex-1">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Living Expenses"
                />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    className={`w-6 h-6 rounded-full border-2 ${
                      newGroupColor === color.value ? 'border-foreground' : 'border-muted'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setNewGroupColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddGroupDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                Add Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Add a new category to the selected group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    className={`w-6 h-6 rounded-full border-2 ${
                      newCategoryColor === color.value ? 'border-foreground' : 'border-muted'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setNewCategoryColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Add Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Modify the category details or move it to another group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    className={`w-6 h-6 rounded-full border-2 ${
                      editCategoryColor === color.value ? 'border-foreground' : 'border-muted'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setEditCategoryColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Group</Label>
              <Select value={editCategoryGroupId} onValueChange={setEditCategoryGroupId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditCategoryDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditCategory} disabled={!editCategoryName.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migration Dialog */}
      <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Migrate Expenses</DialogTitle>
            <DialogDescription>
              The category "{categoryToDelete?.name}" is used by {expenseCount} expense{expenseCount !== 1 ? 's' : ''}. 
              Please select a category to migrate these expenses to before deletion.
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              All expenses currently categorized as "{categoryToDelete?.name}" will be moved to the selected category.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="migration-target">Select target category</Label>
              <Select value={migrationTargetId} onValueChange={setMigrationTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => cat.id !== categoryToDelete?.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button 
              onClick={handleMigrateAndDelete}
              disabled={!migrationTargetId || isDeleting}
            >
              {isDeleting ? 'Migrating...' : `Migrate ${expenseCount} expense${expenseCount !== 1 ? 's' : ''} & Delete`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default HouseholdCategoryManager;
