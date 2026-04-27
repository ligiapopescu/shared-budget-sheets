import { useState, useEffect, useCallback } from 'react';
import { SavingsAccount, SavingsSnapshot } from '@/interfaces/savings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { newId, nowIso } from '@/integrations/google/client';
import { getAllowedUserIds, getHouseholdIdForUser } from '@/integrations/google/householdScope';

// savings_accounts: 0:id 1:user_id 2:name 3:account_type 4:currency 5:holding_type
//                   6:stock_symbol 7:stock_name 8:description 9:household_id 10:created_at 11:updated_at
const deserializeAccount = (r: string[]): SavingsAccount => ({
  id: r[0], user_id: r[1], name: r[2], account_type: r[3], currency: r[4],
  holding_type: r[5] as 'currency' | 'stock',
  stock_symbol: r[6] || undefined, stock_name: r[7] || undefined,
  description: r[8] || undefined, created_at: r[10] ?? '', updated_at: r[11] ?? '',
});

// savings_snapshots: 0:id 1:user_id 2:savings_account_id 3:month 4:year 5:balance
//                    6:stock_quantity 7:stock_price_per_share 8:notes 9:household_id 10:created_at 11:updated_at
const deserializeSnapshot = (r: string[]): SavingsSnapshot => ({
  id: r[0], user_id: r[1], savings_account_id: r[2],
  month: parseInt(r[3]) || 0, year: parseInt(r[4]) || 0,
  balance: parseFloat(r[5]) || 0,
  stock_quantity: r[6] ? parseFloat(r[6]) : undefined,
  stock_price_per_share: r[7] ? parseFloat(r[7]) : undefined,
  notes: r[8] || undefined, created_at: r[10] ?? '', updated_at: r[11] ?? '',
});

export const useSavingsData = (includeHouseholdData = false) => {
  const { user, sheetsService } = useAuth();
  const { toast } = useToast();
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [savingsSnapshots, setSavingsSnapshots] = useState<SavingsSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavingsData = useCallback(async () => {
    if (!user || !sheetsService) return;
    try {
      setLoading(true);
      const allowedIds = await getAllowedUserIds(sheetsService, user.id, includeHouseholdData);

      const [allAccounts, allSnapshots] = await Promise.all([
        sheetsService.getAll('savings_accounts', deserializeAccount),
        sheetsService.getAll('savings_snapshots', deserializeSnapshot),
      ]);

      setSavingsAccounts(allAccounts.filter(a => allowedIds.has(a.user_id)));
      setSavingsSnapshots(
        allSnapshots
          .filter(s => allowedIds.has(s.user_id))
          .sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month),
      );
    } catch (e) {
      console.error('Error loading savings data:', e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load savings data' });
    } finally { setLoading(false); }
  }, [user, sheetsService, includeHouseholdData]);

  useEffect(() => { loadSavingsData(); }, [loadSavingsData]);

  const addSavingsAccount = async (account: Omit<SavingsAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !sheetsService) return;
    const now = nowIso();
    const hid = await getHouseholdIdForUser(sheetsService, user.id);
    const acc: SavingsAccount = { ...account, id: newId(), user_id: user.id, created_at: now, updated_at: now };
    setSavingsAccounts(prev => [...prev, acc]);
    try {
      await sheetsService.appendRow('savings_accounts', [
        acc.id, acc.user_id, acc.name, acc.account_type, acc.currency, acc.holding_type,
        acc.stock_symbol ?? '', acc.stock_name ?? '', acc.description ?? '',
        hid ?? '', acc.created_at, acc.updated_at,
      ]);
      toast({ title: 'Success', description: 'Savings account created' });
    } catch (e) {
      setSavingsAccounts(prev => prev.filter(a => a.id !== acc.id));
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create savings account' });
    }
  };

  const updateSavingsSnapshot = async (
    accountId: string, month: number, year: number, balance: number,
    notes?: string, stockQuantity?: number, stockPricePerShare?: number,
  ) => {
    if (!user || !sheetsService) return;
    const hid = await getHouseholdIdForUser(sheetsService, user.id);
    const now = nowIso();

    // Find existing snapshot for this account/month/year
    const existing = savingsSnapshots.find(
      s => s.savings_account_id === accountId && s.month === month && s.year === year,
    );

    const snap: SavingsSnapshot = {
      id: existing?.id ?? newId(), user_id: user.id, savings_account_id: accountId,
      month, year, balance, notes, stock_quantity: stockQuantity,
      stock_price_per_share: stockPricePerShare,
      created_at: existing?.created_at ?? now, updated_at: now,
    };

    setSavingsSnapshots(prev => {
      const filtered = prev.filter(s => !(s.savings_account_id === accountId && s.month === month && s.year === year));
      return [...filtered, snap].sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month);
    });

    try {
      const row = [
        snap.id, snap.user_id, snap.savings_account_id, String(month), String(year),
        String(balance), stockQuantity != null ? String(stockQuantity) : '',
        stockPricePerShare != null ? String(stockPricePerShare) : '',
        notes ?? '', hid ?? '', snap.created_at, snap.updated_at,
      ];
      if (existing) {
        await sheetsService.updateById('savings_snapshots', existing.id, {
          balance: String(balance), notes: notes ?? '',
          stock_quantity: stockQuantity != null ? String(stockQuantity) : '',
          stock_price_per_share: stockPricePerShare != null ? String(stockPricePerShare) : '',
          updated_at: now,
        });
      } else {
        await sheetsService.appendRow('savings_snapshots', row);
      }
      toast({ title: 'Success', description: 'Savings snapshot updated' });
    } catch (e) {
      console.error('Error updating savings snapshot:', e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update savings snapshot' });
    }
  };

  const getSnapshotForAccountAndMonth = (accountId: string, month: number, year: number): SavingsSnapshot | null =>
    savingsSnapshots.find(s => s.savings_account_id === accountId && s.month === month && s.year === year) ?? null;

  const getLatestBalanceForAccount = (accountId: string): number => {
    const sorted = savingsSnapshots
      .filter(s => s.savings_account_id === accountId)
      .sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month);
    return sorted[0]?.balance ?? 0;
  };

  const deleteSavingsAccount = async (accountId: string) => {
    if (!sheetsService) return;
    const snapAcc = savingsAccounts.find(a => a.id === accountId);
    const snapSnaps = savingsSnapshots.filter(s => s.savings_account_id === accountId);
    setSavingsAccounts(prev => prev.filter(a => a.id !== accountId));
    setSavingsSnapshots(prev => prev.filter(s => s.savings_account_id !== accountId));
    try {
      await Promise.all(snapSnaps.map(s => sheetsService.delete('savings_snapshots', s.id)));
      await sheetsService.delete('savings_accounts', accountId);
      toast({ title: 'Success', description: 'Savings account deleted' });
    } catch (e) {
      if (snapAcc) setSavingsAccounts(prev => [...prev, snapAcc]);
      setSavingsSnapshots(prev => [...prev, ...snapSnaps]);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete savings account' });
    }
  };

  return {
    savingsAccounts, savingsSnapshots, loading,
    addSavingsAccount, updateSavingsSnapshot,
    getSnapshotForAccountAndMonth, getLatestBalanceForAccount,
    deleteSavingsAccount, refetch: loadSavingsData,
  };
};
