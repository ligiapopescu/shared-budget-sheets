import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Category, CategoryGroup } from '@/interfaces';
import CategorySelect from '@/components/CategorySelect';
import { toast } from 'sonner';

interface BulkChangeCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  categories: Category[];
  categoryGroups?: CategoryGroup[];
  onConfirm: (newCategory: string) => void;
}

const BulkChangeCategoryDialog = ({
  open,
  onOpenChange,
  selectedCount,
  categories,
  categoryGroups,
  onConfirm,
}: BulkChangeCategoryDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const handleSubmit = () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    onConfirm(selectedCategory);
    setSelectedCategory('');
    toast.success(`Category updated for ${selectedCount} expense(s)`);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedCategory('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Category</DialogTitle>
          <DialogDescription>
            Update the category for {selectedCount} selected expense{selectedCount !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">
            Select new category
          </label>
          <CategorySelect
            categories={categories}
            categoryGroups={categoryGroups}
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            placeholder="Choose a category"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedCategory}>
            Apply to {selectedCount} expense{selectedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkChangeCategoryDialog;
