import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Household } from '@/interfaces/household';
import { Category } from '@/interfaces';
import { newId, nowIso } from '@/integrations/google/client';

// households: 0:id 1:name 2:created_by 3:created_at 4:updated_at
const deserializeHousehold = (r: string[]): Household => ({
  id: r[0], name: r[1], created_by: r[2], created_at: r[3] ?? '', updated_at: r[4] ?? '',
});

export const useHouseholds = () => {
  const { user, sheetsService } = useAuth();
  const { toast } = useToast();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHouseholds = useCallback(async () => {
    if (!user || !sheetsService) { setLoading(false); return; }
    try {
      setLoading(true);
      const all = await sheetsService.getAll('households', deserializeHousehold);
      setHouseholds(all.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e) {
      console.error('Error loading households:', e);
      toast({ title: 'Error', description: 'Failed to load households', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [user, sheetsService]);

  useEffect(() => { loadHouseholds(); }, [loadHouseholds]);

  const createHousehold = async (name: string) => {
    if (!user || !sheetsService) return null;
    try {
      const now = nowIso();
      const hid = newId();
      const household: Household = { id: hid, name: name.trim(), created_by: user.id, created_at: now, updated_at: now };
      await sheetsService.appendRow('households', [hid, name.trim(), user.id, now, now]);

      // Add creator as first household_person
      const pid = newId();
      await sheetsService.appendRow('household_persons', [
        pid, user.id, hid, user.email?.split('@')[0] || 'User', user.email ?? '',
        user.id, // connected_user_id = self
        'true',  // include_in_household_view
        now, now,
      ]);

      setHouseholds(prev => [household, ...prev]);
      toast({ title: 'Success', description: 'Household created successfully' });
      return household;
    } catch (e) {
      console.error('Error creating household:', e);
      toast({ title: 'Error', description: 'Failed to create household', variant: 'destructive' });
      return null;
    }
  };

  const joinHousehold = async (householdId: string, _userCategories: Category[]) => {
    if (!user || !sheetsService) return false;
    try {
      const now = nowIso();
      await sheetsService.appendRow('household_persons', [
        newId(), user.id, householdId, user.email?.split('@')[0] || 'User', user.email ?? '',
        user.id, 'true', now, now,
      ]);
      toast({ title: 'Success', description: 'Joined household successfully' });
      return true;
    } catch (e) {
      console.error('Error joining household:', e);
      toast({ title: 'Error', description: 'Failed to join household', variant: 'destructive' });
      return false;
    }
  };

  const mapUserCategories = async (
    householdId: string,
    mappings: Array<{ userCategoryId: string; householdCategoryId: string }>,
  ) => {
    if (!user || !sheetsService) return false;
    try {
      const now = nowIso();
      for (const m of mappings) {
        await sheetsService.appendRow('user_category_mappings', [
          newId(), user.id, m.userCategoryId, m.householdCategoryId, householdId, now,
        ]);
        // Update existing expenses that used the old category
        const expenses = await sheetsService.getWhere('expenses', 'category_id', m.userCategoryId, r => r);
        for (const row of expenses) {
          if (row[6] === user.id) { // user_id col=6
            await sheetsService.updateById('expenses', row[0], { category_id: m.householdCategoryId });
          }
        }
      }
      toast({ title: 'Success', description: 'Categories mapped and expenses updated' });
      return true;
    } catch (e) {
      console.error('Error mapping categories:', e);
      toast({ title: 'Error', description: 'Failed to map categories', variant: 'destructive' });
      return false;
    }
  };

  return { households, loading, createHousehold, joinHousehold, mapUserCategories, refreshHouseholds: loadHouseholds };
};
