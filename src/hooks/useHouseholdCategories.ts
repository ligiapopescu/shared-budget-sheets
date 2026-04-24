import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { HouseholdCategory } from '@/interfaces/household-categories';
import { newId, nowIso } from '@/integrations/google/client';

// household_categories: 0:id 1:household_id 2:name 3:color 4:is_default 5:group_id 6:created_at 7:updated_at
const deserialize = (r: string[]): HouseholdCategory => ({
  id: r[0], household_id: r[1], name: r[2], color: r[3],
  is_default: r[4] === 'true', group_id: r[5] || null,
  created_at: r[6] ?? '', updated_at: r[7] ?? '',
});

export const useHouseholdCategories = () => {
  const { user, sheetsService } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<HouseholdCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const getHouseholdId = useCallback(async () => {
    if (!sheetsService || !user) return null;
    const rows = await sheetsService.getWhereMultiple(
      'household_persons', r => r[1] === user.id || r[5] === user.id, r => r,
    );
    return rows[0]?.[2] ?? null;
  }, [sheetsService, user]);

  const loadCategories = useCallback(async () => {
    if (!user || !sheetsService) return;
    try {
      setLoading(true);
      const hid = await getHouseholdId();
      if (!hid) { setCategories([]); return; }
      const data = await sheetsService.getWhere('household_categories', 'household_id', hid, deserialize);
      setCategories(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error('Error loading household categories:', e);
      toast({ title: 'Error', description: 'Failed to load household categories', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [user, sheetsService, getHouseholdId]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const addCategory = async (data: Omit<HouseholdCategory, 'id' | 'created_at' | 'updated_at'>) => {
    if (!sheetsService) return;
    const now = nowIso();
    const cat: HouseholdCategory = { ...data, id: newId(), created_at: now, updated_at: now };
    setCategories(prev => [...prev, cat]);
    try {
      await sheetsService.appendRow('household_categories', [
        cat.id, cat.household_id, cat.name, cat.color, String(cat.is_default),
        cat.group_id ?? '', cat.created_at, cat.updated_at,
      ]);
      toast({ title: 'Success', description: 'Category added' });
    } catch (e) {
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      toast({ title: 'Error', description: 'Failed to add category', variant: 'destructive' });
    }
  };

  const updateCategory = async (id: string, updates: Partial<HouseholdCategory>) => {
    if (!sheetsService) return;
    const snap = categories.find(c => c.id === id);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: nowIso() } : c));
    try {
      await sheetsService.updateById('household_categories', id,
        Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, String(v ?? '')])));
      toast({ title: 'Success', description: 'Category updated' });
    } catch (e) {
      if (snap) setCategories(prev => prev.map(c => c.id === id ? snap : c));
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' });
    }
  };

  const deleteCategory = async (id: string) => {
    if (!sheetsService) return;
    const snap = categories.find(c => c.id === id);
    setCategories(prev => prev.filter(c => c.id !== id));
    try {
      await sheetsService.delete('household_categories', id);
      toast({ title: 'Success', description: 'Category deleted' });
    } catch (e) {
      if (snap) setCategories(prev => [...prev, snap]);
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
    }
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory, refreshCategories: loadCategories };
};
