import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseAutomationRule } from '@/interfaces';
import { toast } from '@/hooks/use-toast';
import { newId, nowIso } from '@/integrations/google/client';

// expense_automation_rules columns:
// 0:id 1:user_id 2:rule_type 3:merchant_pattern 4:description_pattern 5:category_id
// 6:category_group_id 7:household_person_id 8:split_amount 9:split_method 10:is_active
// 11:created_at 12:updated_at
const deserialize = (r: string[]): ExpenseAutomationRule => ({
  id: r[0], user_id: r[1], rule_type: r[2] as 'delete' | 'split',
  merchant_pattern: r[3] || undefined, description_pattern: r[4] || undefined,
  category_id: r[5] || undefined, category_group_id: r[6] || undefined,
  household_person_id: r[7] || undefined,
  split_amount: r[8] ? parseFloat(r[8]) : undefined,
  split_method: r[9] ? (r[9] as 'amount' | 'percentage') : undefined,
  is_active: r[10] === 'true', created_at: r[11] ?? '', updated_at: r[12] ?? '',
});

const serialize = (rule: ExpenseAutomationRule): string[] => [
  rule.id, rule.user_id, rule.rule_type,
  rule.merchant_pattern ?? '', rule.description_pattern ?? '',
  rule.category_id ?? '', rule.category_group_id ?? '',
  rule.household_person_id ?? '',
  rule.split_amount != null ? String(rule.split_amount) : '',
  rule.split_method ?? '', String(rule.is_active),
  rule.created_at, rule.updated_at,
];

export const useAutomationRules = () => {
  const { user, sheetsService } = useAuth();
  const [rules, setRules] = useState<ExpenseAutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = async () => {
    if (!user || !sheetsService) return;
    try {
      setLoading(true);
      const data = await sheetsService.getWhere('expense_automation_rules', 'user_id', user.id, deserialize);
      setRules(data.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e) {
      console.error('Error fetching automation rules:', e);
      toast({ title: 'Error', description: 'Failed to load automation rules', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, [user, sheetsService]);

  const addRule = async (rule: Omit<ExpenseAutomationRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !sheetsService) return;
    const now = nowIso();
    const full: ExpenseAutomationRule = { ...rule, id: newId(), user_id: user.id, created_at: now, updated_at: now };
    setRules(prev => [full, ...prev]);
    try {
      await sheetsService.appendRow('expense_automation_rules', serialize(full));
      toast({ title: 'Success', description: 'Automation rule added' });
      return full;
    } catch (e) {
      setRules(prev => prev.filter(r => r.id !== full.id));
      toast({ title: 'Error', description: 'Failed to add rule', variant: 'destructive' });
      throw e;
    }
  };

  const updateRule = async (id: string, updates: Partial<ExpenseAutomationRule>) => {
    if (!sheetsService) return;
    const prev = rules.find(r => r.id === id);
    if (!prev) return;
    const updated = { ...prev, ...updates, updated_at: nowIso() };
    setRules(rls => rls.map(r => r.id === id ? updated : r));
    try {
      await sheetsService.updateById('expense_automation_rules', id,
        Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, String(v ?? '')])));
      toast({ title: 'Success', description: 'Rule updated' });
      return updated;
    } catch (e) {
      setRules(rls => rls.map(r => r.id === id ? prev : r));
      toast({ title: 'Error', description: 'Failed to update rule', variant: 'destructive' });
      throw e;
    }
  };

  const deleteRule = async (id: string) => {
    if (!sheetsService) return;
    const snap = rules.find(r => r.id === id);
    setRules(prev => prev.filter(r => r.id !== id));
    try {
      await sheetsService.delete('expense_automation_rules', id);
      toast({ title: 'Success', description: 'Rule deleted' });
    } catch (e) {
      if (snap) setRules(prev => [snap, ...prev]);
      toast({ title: 'Error', description: 'Failed to delete rule', variant: 'destructive' });
      throw e;
    }
  };

  const toggleRule = async (id: string, isActive: boolean) => updateRule(id, { is_active: isActive });

  return { rules, loading, addRule, updateRule, deleteRule, toggleRule, refetch: fetchRules };
};
