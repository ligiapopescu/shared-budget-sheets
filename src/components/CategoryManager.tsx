import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit, Plus, Users } from 'lucide-react';
import { Category } from '@/interfaces';
import { useAuth } from '@/contexts/AuthContext';
import { newId, nowIso } from '@/integrations/google/client';
import { useHouseholdStatus } from '@/hooks/useHouseholdStatus';
import HouseholdCategoryManager from '@/components/household/HouseholdCategoryManager';
import CreateHouseholdDialog from './household/CreateHouseholdDialog';
import { useHouseholds } from '@/hooks/useHouseholds';

interface CategoryManagerProps {
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
}

const CategoryManager = ({ categories, onUpdateCategories }: CategoryManagerProps) => {
  const { isInHousehold, loading: householdLoading, refreshStatus } = useHouseholdStatus();
  const { createHousehold } = useHouseholds();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  if (householdLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  const handleCreateHousehold = async (name: string) => {
    try {
      const household = await createHousehold(name);
      if (household) {
        toast({
          title: "Household Created",
          description: `${name} has been created successfully`,
        });
        setShowCreateDialog(false);
        refreshStatus();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create household",
        variant: "destructive",
      });
    }
  };

  // If user is not in a household, show create household option and personal categories
  if (!isInHousehold) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Household
            </CardTitle>
            <CardDescription>
              Create a household to share expenses with family or roommates. 
              To join an existing household, ask someone to send you an invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="w-full flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New Household
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Personal Categories</CardTitle>
            <CardDescription>
              Manage your personal expense categories. When you join a household, 
              you'll be able to map these to shared household categories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PersonalCategoryManager 
              categories={categories}
              onUpdateCategories={onUpdateCategories}
            />
          </CardContent>
        </Card>

        <CreateHouseholdDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateHousehold={handleCreateHousehold}
        />
      </div>
    );
  }

  // If user is in a household, show household category manager instead
  return (
    <div className="space-y-6">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          You're part of a household. Categories are now managed at the household level and shared with all household members.
        </AlertDescription>
      </Alert>
      <HouseholdCategoryManager />
    </div>
  );
};

interface PersonalCategoryManagerProps {
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
}

const PersonalCategoryManager = ({ categories, onUpdateCategories }: PersonalCategoryManagerProps) => {
  const { user, sheetsService } = useAuth();
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3b82f6' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState({ name: '', color: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const predefinedColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ];

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Invalid Name",
        description: "Category name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === newCategory.name.toLowerCase())) {
      toast({
        title: "Duplicate Category",
        description: "A category with this name already exists",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add categories",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (!sheetsService) throw new Error('Not connected');
      const id = newId();
      const now = nowIso();
      await sheetsService.appendRow('categories', [id, newCategory.name, newCategory.color, 'false', user.id, now]);
      const category: Category = { id, name: newCategory.name, color: newCategory.color };

      onUpdateCategories([...categories, category]);
      setNewCategory({ name: '', color: '#3b82f6' });
      
      toast({
        title: "Category Added",
        description: "New category has been created successfully",
      });
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to delete categories",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (!sheetsService) throw new Error('Not connected');
      await sheetsService.delete('categories', id);
      onUpdateCategories(categories.filter(cat => cat.id !== id));
      toast({
        title: "Category Deleted",
        description: "Category has been removed",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingId(category.id);
    setEditingCategory({ name: category.name, color: category.color });
  };

  const handleSaveEdit = async () => {
    if (!editingCategory.name.trim()) {
      toast({
        title: "Invalid Name",
        description: "Category name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!user || !editingId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to edit categories",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (!sheetsService) throw new Error('Not connected');
      await sheetsService.updateById('categories', editingId, {
        name: editingCategory.name, color: editingCategory.color,
      });
      onUpdateCategories(categories.map(cat =>
        cat.id === editingId ? { ...cat, name: editingCategory.name, color: editingCategory.color } : cat
      ));
      
      setEditingId(null);
      setEditingCategory({ name: '', color: '' });
      
      toast({
        title: "Category Updated",
        description: "Category has been modified successfully",
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Category */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Category</CardTitle>
          <CardDescription>Create a custom category for your expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                placeholder="Enter category name"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                disabled={loading}
              />
            </div>
            
            <div>
              <Label htmlFor="categoryColor">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded border"
                  disabled={loading}
                />
                <Button onClick={handleAddCategory} disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  {loading ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Label>Quick Colors</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform disabled:opacity-50"
                  style={{ backgroundColor: color }}
                  onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                  disabled={loading}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Categories */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Categories</CardTitle>
            <CardDescription>Edit or delete existing categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  {editingId === category.id ? (
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="color"
                        value={editingCategory.color}
                        onChange={(e) => setEditingCategory(prev => ({ ...prev, color: e.target.value }))}
                        className="w-8 h-8 rounded border"
                        disabled={loading}
                      />
                      <Input
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                        className="flex-1"
                        disabled={loading}
                      />
                      <Button onClick={handleSaveEdit} size="sm" disabled={loading}>
                        {loading ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        onClick={() => setEditingId(null)} 
                        variant="outline" 
                        size="sm"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{category.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCategory(category.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CategoryManager;
