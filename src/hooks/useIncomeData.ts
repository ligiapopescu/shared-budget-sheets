import { useState, useEffect, useCallback } from 'react';
import { Income } from '@/interfaces';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { newId, nowIso } from '@/integrations/google/client';

// income: 0:id 1:date 2:source 3:amount 4:currency 5:user_id 6:description 7:household_id 8:created_at 9:updated_at
const deserialize = (r: string[]): Income => ({
  id: r[0], date: r[1], source: r[2], amount: parseFloat(r[3]) || 0,
  currency: r[4], user_id: r[5], description: r[6] || undefined,
});

export const useIncomeData = (includeHouseholdData = false) => {
  const { user, sheetsService } = useAuth();
  const { toast } = useToast();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIncomes = useCallback(async () => {
    if (!user || !sheetsService) return;
    try {
      setLoading(true);
      const allowedIds = new Set([user.id]);

      if (includeHouseholdData) {
        const persons = await sheetsService.getWhereMultiple(
          'household_persons', r => r[1] === user.id || r[5] === user.id, r => r,
        );
        persons.forEach(r => {
          if (r[1]) allowedIds.add(r[1]);
          if (r[5]) allowedIds.add(r[5]);
        });
      }

      const all = await sheetsService.getAll('income', deserialize);
      const filtered = all
        .filter(i => allowedIds.has(i.user_id))
        .sort((a, b) => b.date.localeCompare(a.date));
      setIncomes(filtered);
    } catch (e) {
      console.error('Error loading incomes:', e);
      toast({ title: 'Error', description: 'Failed to load income records.', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [user, sheetsService, includeHouseholdData]);

  useEffect(() => { loadIncomes(); }, [loadIncomes]);

  const getHouseholdId = async () => {
    if (!sheetsService || !user) return null;
    const rows = await sheetsService.getWhereMultiple(
      'household_persons', r => r[1] === user.id || r[5] === user.id, r => r,
    );
    return rows[0]?.[2] ?? null;
  };

  const addIncome = async (incomeData: Omit<Income, 'id' | 'user_id'>) => {
    if (!user || !sheetsService) return;
    const now = nowIso();
    const hid = await getHouseholdId();
    const income: Income = { ...incomeData, id: newId(), user_id: user.id };
    setIncomes(prev => [income, ...prev]);
    try {
      await sheetsService.appendRow('income', [
        income.id, income.date, income.source, String(income.amount),
        income.currency, income.user_id, income.description ?? '',
        hid ?? '', now, now,
      ]);
    } catch (e) {
      setIncomes(prev => prev.filter(i => i.id !== income.id));
      throw e;
    }
  };

  const updateIncome = async (id: string, updates: Partial<Income>) => {
    if (!sheetsService) return;
    const snap = incomes.find(i => i.id === id);
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    try {
      await sheetsService.updateById('income', id,
        Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, String(v ?? '')])));
    } catch (e) {
      if (snap) setIncomes(prev => prev.map(i => i.id === id ? snap : i));
      throw e;
    }
  };

  const deleteIncome = async (id: string) => {
    if (!sheetsService) return;
    const snap = incomes.find(i => i.id === id);
    setIncomes(prev => prev.filter(i => i.id !== id));
    try {
      await sheetsService.delete('income', id);
    } catch (e) {
      if (snap) setIncomes(prev => [snap, ...prev]);
      throw e;
    }
  };

  return { incomes, loading, addIncome, updateIncome, deleteIncome, refreshIncomes: loadIncomes };
};
