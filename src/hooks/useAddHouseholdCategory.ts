import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { newId, nowIso } from '@/integrations/google/client';
import { HouseholdCategory } from '@/interfaces/household-categories';

// Mutation-only counterpart to useHouseholdCategories. Use this when a
// component only needs to *add* a category — the full hook also fires a
// `loadCategories` request on mount, which becomes catastrophic when the
// component is rendered N times (e.g. CategorySelect once per expense
// row would otherwise issue N parallel reads of household_categories on
// every render).
export const useAddHouseholdCategory = () => {
  const { sheetsService } = useAuth();
  const { toast } = useToast();

  const addCategory = async (
    data: Omit<HouseholdCategory, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<HouseholdCategory | null> => {
    if (!sheetsService) return null;
    const now = nowIso();
    const cat: HouseholdCategory = { ...data, id: newId(), created_at: now, updated_at: now };
    try {
      await sheetsService.appendRow('household_categories', [
        cat.id, cat.household_id, cat.name, cat.color, String(cat.is_default),
        cat.group_id ?? '', cat.created_at, cat.updated_at,
      ]);
      toast({ title: 'Success', description: 'Category added' });
      return cat;
    } catch (e) {
      console.error('Failed to add household category:', e);
      toast({ title: 'Error', description: 'Failed to add category', variant: 'destructive' });
      throw e;
    }
  };

  return { addCategory };
};
