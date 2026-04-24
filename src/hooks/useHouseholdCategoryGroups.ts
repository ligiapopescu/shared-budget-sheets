import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { HouseholdCategoryGroup } from '@/interfaces/household-category-groups';
import { newId, nowIso } from '@/integrations/google/client';

// household_category_groups: 0:id 1:household_id 2:name 3:color 4:icon 5:display_order 6:created_at 7:updated_at
const deserialize = (r: string[]): HouseholdCategoryGroup => ({
  id: r[0], household_id: r[1], name: r[2], color: r[3], icon: r[4],
  display_order: parseInt(r[5]) || 0, created_at: r[6] ?? '', updated_at: r[7] ?? '',
});

export const useHouseholdCategoryGroups = () => {
  const { user, sheetsService } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<HouseholdCategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!user || !sheetsService) return;
    try {
      setLoading(true);
      const persons = await sheetsService.getWhereMultiple(
        'household_persons', r => r[1] === user.id || r[5] === user.id, r => r,
      );
      const hid = persons[0]?.[2] ?? null;
      setHouseholdId(hid);
      if (!hid) { setGroups([]); return; }
      const data = await sheetsService.getWhere('household_category_groups', 'household_id', hid, deserialize);
      setGroups(data.sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)));
    } catch (e) {
      console.error('Error loading household category groups:', e);
      toast({ title: 'Error', description: 'Failed to load category groups', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [user, sheetsService]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const addGroup = async (data: { name: string; color: string; icon: string }) => {
    if (!sheetsService || !householdId) return null;
    const maxOrder = groups.reduce((m, g) => Math.max(m, g.display_order), -1);
    const now = nowIso();
    const group: HouseholdCategoryGroup = {
      id: newId(), household_id: householdId, ...data,
      display_order: maxOrder + 1, created_at: now, updated_at: now,
    };
    setGroups(prev => [...prev, group]);
    try {
      await sheetsService.appendRow('household_category_groups', [
        group.id, group.household_id, group.name, group.color, group.icon,
        String(group.display_order), group.created_at, group.updated_at,
      ]);
      toast({ title: 'Success', description: 'Category group added' });
      return group;
    } catch (e) {
      setGroups(prev => prev.filter(g => g.id !== group.id));
      toast({ title: 'Error', description: 'Failed to add group', variant: 'destructive' });
      return null;
    }
  };

  const updateGroup = async (id: string, updates: Partial<Pick<HouseholdCategoryGroup, 'name' | 'color' | 'icon' | 'display_order'>>) => {
    if (!sheetsService) return null;
    const snap = groups.find(g => g.id === id);
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates, updated_at: nowIso() } : g));
    try {
      await sheetsService.updateById('household_category_groups', id,
        Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, String(v ?? '')])));
      toast({ title: 'Success', description: 'Group updated' });
      return { ...(snap ?? {}), ...updates };
    } catch (e) {
      if (snap) setGroups(prev => prev.map(g => g.id === id ? snap : g));
      toast({ title: 'Error', description: 'Failed to update group', variant: 'destructive' });
      return null;
    }
  };

  const deleteGroup = async (id: string) => {
    if (!sheetsService) return false;
    const snap = groups.find(g => g.id === id);
    setGroups(prev => prev.filter(g => g.id !== id));
    try {
      await sheetsService.delete('household_category_groups', id);
      toast({ title: 'Success', description: 'Group deleted' });
      return true;
    } catch (e) {
      if (snap) setGroups(prev => [...prev, snap]);
      toast({ title: 'Error', description: 'Failed to delete group. Move its categories first.', variant: 'destructive' });
      return false;
    }
  };

  return { groups, loading, householdId, addGroup, updateGroup, deleteGroup, refreshGroups: loadGroups };
};
