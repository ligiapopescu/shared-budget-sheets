import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, Category, CategoryGroup, ExpenseSplit } from '@/interfaces';
import { toast } from 'sonner';
import { newId, nowIso } from '@/integrations/google/client';
import { getHouseholdIdForUser } from '@/integrations/google/householdScope';
import { parseFloatCell } from '@/integrations/google/parsing';

// expenses: 0:id 1:date 2:merchant 3:amount 4:currency 5:category_id
//           6:user_id 7:description 8:household_id 9:created_at 10:updated_at
// debt_entries (splits): 0:id 1:user_id 2:household_person_id 3:amount 4:currency
//                         5:description 6:date 7:type 8:expense_id 9:split_method 10:split_value
//                         11:resolved 12:created_at 13:updated_at

export const useExpenseData = (includeHouseholdData = false) => {
  const { user, sheetsService } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  // Serialises updateExpense calls per expense id. Without this, two
  // back-to-back saves on the same row can interleave so one's "delete
  // old splits" wipes the other's freshly-written splits.
  const inFlightUpdatesRef = useRef<Map<string, Promise<unknown>>>(new Map());

  const loadData = useCallback(async () => {
    if (!user || !sheetsService) return;
    try {
      const sheets = await sheetsService.batchGet([
        'household_persons', 'household_categories', 'household_category_groups',
        'categories', 'expenses', 'debt_entries', 'merchant_categories',
      ]);

      const rawPersons  = sheets['household_persons'] ?? [];
      const rawHCats    = sheets['household_categories'] ?? [];
      const rawHGroups  = sheets['household_category_groups'] ?? [];
      const rawCats     = sheets['categories'] ?? [];
      const rawExpenses = sheets['expenses'] ?? [];
      const rawDebts    = sheets['debt_entries'] ?? [];

      // Determine household membership
      const myPersonRow = rawPersons.find(r => r[1] === user.id || r[5] === user.id);
      const householdId = myPersonRow?.[2] ?? null;

      // Categories & groups
      let formattedCategories: Category[];
      let formattedGroups: CategoryGroup[] = [];

      if (householdId) {
        const hCats = rawHCats.filter(r => r[1] === householdId);
        const hGroups = rawHGroups.filter(r => r[1] === householdId);
        formattedCategories = hCats.map(r => ({ id: r[0], name: r[2], color: r[3], group_id: r[5] || undefined }));
        formattedGroups = hGroups
          .sort((a, b) => (parseInt(a[5]) || 0) - (parseInt(b[5]) || 0))
          .map(r => ({
            id: r[0], name: r[2], color: r[3], icon: r[4],
            categories: formattedCategories.filter(c => c.group_id === r[0]),
          }));
      } else {
        formattedCategories = rawCats
          .filter(r => r[4] === user.id)
          .map(r => ({ id: r[0], name: r[1], color: r[2], group_id: undefined }));
      }
      setCategories(formattedCategories);
      setCategoryGroups(formattedGroups);

      // Allowed user IDs for filtering
      const allowedIds = new Set([user.id]);
      if (includeHouseholdData) {
        rawPersons.forEach(r => {
          if (r[1]) allowedIds.add(r[1]);
          if (r[5]) allowedIds.add(r[5]);
        });
      }

      // Build household person name lookup (for splits)
      const hpNameMap = new Map(rawPersons.filter(r => r[0]).map(r => [r[0], r[3]]));

      // Build debt entries index by expense_id
      const debtByExpense = new Map<string, typeof rawDebts[0][]>();
      rawDebts.filter(r => r[8]).forEach(r => {
        const eid = r[8];
        if (!debtByExpense.has(eid)) debtByExpense.set(eid, []);
        debtByExpense.get(eid)!.push(r);
      });

      // Format expenses
      const catMap = new Map(formattedCategories.map(c => [c.id, c.name]));
      const formatted: Expense[] = rawExpenses
        .filter(r => r[0] && allowedIds.has(r[6]))
        .map(r => {
          const splits: ExpenseSplit[] | undefined = (debtByExpense.get(r[0]) ?? []).map(d => ({
            household_person_id: d[2],
            household_person_name: hpNameMap.get(d[2]) ?? d[2],
            split_method: d[9] as 'amount' | 'percentage',
            split_value: parseFloatCell(d[10], 0, 'debt_entries.split_value'),
            debt_entry_id: d[0],
          }));
          return {
            id: r[0], date: r[1], merchant: r[2], amount: parseFloatCell(r[3], 0, 'expenses.amount'),
            currency: r[4], category: catMap.get(r[5]) ?? 'Unknown',
            user_id: r[6], description: r[7] || undefined,
            splits: splits.length > 0 ? splits : undefined,
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      setExpenses(formatted);
    } catch (e) {
      console.error('Error loading expense data:', e);
    } finally {
      setLoading(false);
    }
  }, [user, sheetsService, includeHouseholdData]);

  useEffect(() => { loadData(); }, [loadData]);

  const getHouseholdId = (): Promise<string | null> =>
    sheetsService && user ? getHouseholdIdForUser(sheetsService, user.id) : Promise.resolve(null);

  const resolveCategoryId = async (categoryName: string): Promise<string | undefined> => {
    const local = categories.find(c => c.name === categoryName);
    return local?.id;
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'user_id'>) => {
    if (!user || !sheetsService) return;
    const categoryId = await resolveCategoryId(expenseData.category);
    if (!categoryId) return;

    const hid = await getHouseholdId();
    const now = nowIso();
    const eid = newId();

    const expRow = [
      eid, expenseData.date, expenseData.merchant, String(expenseData.amount),
      expenseData.currency, categoryId, user.id, expenseData.description ?? '',
      hid ?? '', now, now,
    ];

    // Two failure modes to handle separately:
    //   1. The expense row itself failed -> nothing to roll back; just toast.
    //   2. The expense row succeeded but a debt-entry write failed -> the
    //      sheet has an orphan expense + partial splits. Reload from the
    //      source of truth so local state matches what's actually in Sheets,
    //      and surface a toast so the user knows a partial write happened.
    try {
      await sheetsService.appendRow('expenses', expRow);
    } catch (e) {
      toast.error('Failed to save expense');
      throw e;
    }

    const writtenDebtIds: string[] = [];
    let splitsInfo: ExpenseSplit[] | undefined;
    try {
      if (expenseData.splits && expenseData.splits.length > 0) {
        splitsInfo = [];
        for (const split of expenseData.splits) {
          const splitAmount = split.split_method === 'percentage'
            ? Math.round(expenseData.amount * split.split_value / 100 * 100) / 100
            : split.split_value;
          const did = newId();
          await sheetsService.appendRow('debt_entries', [
            did, user.id, split.household_person_id, String(splitAmount),
            expenseData.currency, `Split from expense: ${expenseData.merchant}`,
            expenseData.date, 'owe_me', eid,
            split.split_method, String(split.split_value), 'false', now, now,
          ]);
          writtenDebtIds.push(did);
          splitsInfo.push({ ...split, debt_entry_id: did });
        }
      }
    } catch (e) {
      // Best-effort cleanup: remove any debt rows we did write, then the
      // orphan expense. If cleanup itself fails the user gets a clear toast
      // and we reload below to reconcile state.
      try {
        await Promise.all(writtenDebtIds.map(did => sheetsService.delete('debt_entries', did)));
        await sheetsService.delete('expenses', eid);
      } catch { /* swallow — handled by reload + toast */ }
      toast.error('Failed to save split — expense was not added');
      await loadData();
      throw e;
    }

    const newExpense: Expense = {
      id: eid, date: expenseData.date, merchant: expenseData.merchant,
      amount: expenseData.amount, category: expenseData.category,
      user_id: user.id, description: expenseData.description, currency: expenseData.currency,
      splits: splitsInfo,
    };
    setExpenses(prev => [newExpense, ...prev]);

    // Merchant-category cache update is best-effort — failure here doesn't
    // affect the visible expense, so log and move on.
    try {
      const mcRows = await sheetsService.getWhereMultiple(
        'merchant_categories',
        r => r[1] === expenseData.merchant && r[3] === user.id,
        r => r,
      );
      if (mcRows.length > 0) {
        await sheetsService.updateById('merchant_categories', mcRows[0][0], {
          category_id: categoryId, last_used: now,
        });
      } else {
        await sheetsService.appendRow('merchant_categories', [newId(), expenseData.merchant, categoryId, user.id, now]);
      }
    } catch (e) {
      console.error('Failed to update merchant_categories cache:', e);
    }
  };

  const updateExpense = async (id: string, expenseData: Partial<Expense>) => {
    if (!sheetsService) return;
    // Serialise per-id: wait for any in-flight update for this same expense
    // to settle before starting ours, so the split-rebuild step can't
    // interleave with a concurrent caller.
    const previous = inFlightUpdatesRef.current.get(id);
    if (previous) await previous.catch(() => {});

    const run = async () => {
    const existing = expenses.find(e => e.id === id);
    if (!existing) return;

    const updates: Record<string, string> = {};
    if (expenseData.date !== undefined)        updates.date = expenseData.date;
    if (expenseData.merchant !== undefined)    updates.merchant = expenseData.merchant;
    if (expenseData.amount !== undefined)      updates.amount = String(expenseData.amount);
    if (expenseData.description !== undefined) updates.description = expenseData.description ?? '';
    if (expenseData.currency !== undefined)    updates.currency = expenseData.currency;
    if (expenseData.category !== undefined) {
      const cid = await resolveCategoryId(expenseData.category);
      if (cid) updates.category_id = cid;
    }

    if (Object.keys(updates).length > 0) {
      await sheetsService.updateById('expenses', id, updates);
    }

    let splitsInfo = existing.splits;
    if (expenseData.splits !== undefined) {
      // Delete old debt entries for this expense
      const debtRows = await sheetsService.getWhere('debt_entries', 'expense_id', id, r => r);
      await Promise.all(debtRows.map(r => sheetsService.delete('debt_entries', r[0])));

      if (expenseData.splits.length > 0) {
        const now = nowIso();
        const expAmt = expenseData.amount ?? existing.amount;
        const expCur = expenseData.currency ?? existing.currency;
        const expDate = expenseData.date ?? existing.date;
        const expMerchant = expenseData.merchant ?? existing.merchant;
        splitsInfo = [];
        for (const split of expenseData.splits) {
          const splitAmt = split.split_method === 'percentage'
            ? parseFloat((expAmt * split.split_value / 100).toFixed(2))
            : split.split_value;
          const did = newId();
          await sheetsService.appendRow('debt_entries', [
            did, user!.id, split.household_person_id, String(splitAmt),
            expCur, `Split of ${expMerchant}`, expDate,
            'owe_me', id, split.split_method, String(split.split_value), 'false', now, now,
          ]);
          splitsInfo.push({ ...split, debt_entry_id: did });
        }
      } else {
        splitsInfo = undefined;
      }
    }

    setExpenses(prev => prev.map(e => e.id === id ? {
      ...e, ...expenseData,
      category: expenseData.category ?? e.category,
      splits: splitsInfo,
    } : e));
    };

    const promise = run();
    inFlightUpdatesRef.current.set(id, promise);
    try {
      await promise;
    } finally {
      if (inFlightUpdatesRef.current.get(id) === promise) {
        inFlightUpdatesRef.current.delete(id);
      }
    }
  };

  const deleteExpense = async (id: string) => {
    if (!sheetsService) return;
    const snapshot = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      const debtRows = await sheetsService.getWhere('debt_entries', 'expense_id', id, r => r);
      await Promise.all(debtRows.map(r => sheetsService.delete('debt_entries', r[0])));
      await sheetsService.delete('expenses', id);
    } catch (e) {
      if (snapshot) setExpenses(prev => [snapshot, ...prev]);
      toast.error('Failed to delete expense');
      throw e;
    }
  };

  const removeSplitFromExpense = async (expenseId: string, debtEntryId?: string) => {
    if (!sheetsService) return;
    if (debtEntryId) {
      await sheetsService.delete('debt_entries', debtEntryId);
      setExpenses(prev => prev.map(e => {
        if (e.id !== expenseId || !e.splits) return e;
        const updated = e.splits.filter(s => s.debt_entry_id !== debtEntryId);
        return { ...e, splits: updated.length > 0 ? updated : undefined };
      }));
    } else {
      const debtRows = await sheetsService.getWhere('debt_entries', 'expense_id', expenseId, r => r);
      await Promise.all(debtRows.map(r => sheetsService.delete('debt_entries', r[0])));
      setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, splits: undefined } : e));
    }
  };

  const getMerchantCategory = (merchant: string): string => {
    const last = expenses
      .filter(e => e.merchant.toLowerCase().includes(merchant.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return last?.category ?? 'Other';
  };

  return {
    expenses, categories, categoryGroups, loading,
    addExpense, deleteExpense, getMerchantCategory, setCategories,
    updateExpense, removeSplitFromExpense, refreshData: loadData,
  };
};
