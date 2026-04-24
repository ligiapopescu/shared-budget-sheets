import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Category } from '@/interfaces';
import { HouseholdCategory } from '@/interfaces/household-categories';

interface CategoryMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userCategories: Category[];
  householdCategories: HouseholdCategory[];
  onSaveMappings: (mappings: Array<{ userCategoryId: string; householdCategoryId: string }>) => void;
}

const CategoryMappingDialog = ({ 
  open, 
  onOpenChange, 
  userCategories, 
  householdCategories, 
  onSaveMappings 
}: CategoryMappingDialogProps) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const handleMappingChange = (userCategoryId: string, householdCategoryId: string) => {
    setMappings(prev => ({
      ...prev,
      [userCategoryId]: householdCategoryId
    }));
  };

  const handleSave = () => {
    const mappingArray = Object.entries(mappings)
      .filter(([_, householdCategoryId]) => householdCategoryId)
      .map(([userCategoryId, householdCategoryId]) => ({
        userCategoryId,
        householdCategoryId
      }));

    onSaveMappings(mappingArray);
    onOpenChange(false);
  };

  const allMapped = userCategories.length > 0 && userCategories.every(cat => mappings[cat.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Map Your Categories to Household Categories</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Map each of your personal categories to the corresponding household category. 
            This will update all your existing expenses to use household categories.
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {userCategories.map((userCategory) => (
            <div key={userCategory.id} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: userCategory.color }}
                  />
                  <span className="font-medium">{userCategory.name}</span>
                </div>
                <Label className="text-sm text-muted-foreground">Your Category</Label>
              </div>
              
              <div className="flex-1">
                <Select
                  value={mappings[userCategory.id] || ''}
                  onValueChange={(value) => handleMappingChange(userCategory.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select household category" />
                  </SelectTrigger>
                  <SelectContent>
                    {householdCategories.map((householdCategory) => (
                      <SelectItem key={householdCategory.id} value={householdCategory.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: householdCategory.color }}
                          />
                          {householdCategory.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label className="text-sm text-muted-foreground">Household Category</Label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!allMapped}>
            Save Mappings & Update Expenses
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryMappingDialog;