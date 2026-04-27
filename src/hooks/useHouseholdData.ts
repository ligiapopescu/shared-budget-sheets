import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HouseholdPerson, DebtEntry, HouseholdInvitation } from '@/interfaces/debt';
import { newId, nowIso } from '@/integrations/google/client';
import { parseFloatCell, parseFloatOpt } from '@/integrations/google/parsing';

// household_persons: 0:id 1:user_id 2:household_id 3:name 4:email 5:connected_user_id 6:include_in_household_view 7:created_at 8:updated_at
const deserializePerson = (r: string[]): HouseholdPerson => ({
  id: r[0], user_id: r[1], household_id: r[2] || undefined, name: r[3], email: r[4] || undefined,
  connected_user_id: r[5] || undefined, include_in_household_view: r[6] === 'true',
  created_at: r[7] ?? '', updated_at: r[8] ?? '',
});

// debt_entries: 0:id 1:user_id 2:household_person_id 3:amount 4:currency 5:description
//               6:date 7:type 8:expense_id 9:split_method 10:split_value 11:resolved 12:created_at 13:updated_at
const deserializeDebt = (r: string[]): Omit<DebtEntry, 'household_person' | 'creator' | 'otherPersonHouseholdId'> => ({
  id: r[0], user_id: r[1], household_person_id: r[2], amount: parseFloatCell(r[3], 0, 'debt_entries.amount'),
  currency: r[4], description: r[5] || undefined, date: r[6],
  type: r[7] as 'owe_me' | 'i_owe', expense_id: r[8] || undefined,
  split_method: r[9] ? (r[9] as 'amount' | 'percentage') : undefined,
  split_value: parseFloatOpt(r[10], 'debt_entries.split_value'),
  resolved: r[11] === 'true', created_at: r[12] ?? '', updated_at: r[13] ?? '',
});

// household_invitations: 0:id 1:inviter_user_id 2:household_person_id 3:invited_email 4:invited_user_id 5:status 6:created_at 7:updated_at
// profiles: 0:id 1:email 2:full_name 3:created_at 4:updated_at

export const useHouseholdData = () => {
  const { user, sheetsService } = useAuth();
  const [householdPersons, setHouseholdPersons] = useState<HouseholdPerson[]>([]);
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>([]);
  const [invitations, setInvitations] = useState<HouseholdInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user || !sheetsService) return;
    try {
      const sheets = await sheetsService.batchGet([
        'household_persons', 'debt_entries', 'household_invitations', 'profiles',
      ]);

      const rawPersons = sheets['household_persons'] ?? [];
      const rawDebts   = sheets['debt_entries'] ?? [];
      const rawInvs    = sheets['household_invitations'] ?? [];
      const rawProfs   = sheets['profiles'] ?? [];

      // Build profile lookup: id → { id, email, full_name }
      const profileMap = new Map(rawProfs.filter(r => r[0]).map(r => [
        r[0], { id: r[0], email: r[1] ?? '', full_name: r[2] || undefined },
      ]));

      // Persons
      const persons: HouseholdPerson[] = rawPersons.filter(r => r[0]).map(r => ({
        ...deserializePerson(r),
        creator: profileMap.get(r[1]),
      }));
      setHouseholdPersons(persons.sort((a, b) => a.name.localeCompare(b.name)));

      // Debt entries — join with persons and profiles
      const personMap = new Map(persons.map(p => [p.id, p]));
      const debts: DebtEntry[] = rawDebts.filter(r => r[0]).map(r => {
        const base = deserializeDebt(r);
        const hp = personMap.get(base.household_person_id);
        const creator = profileMap.get(base.user_id);
        let otherPersonHouseholdId: string;
        if (base.user_id === user.id) {
          otherPersonHouseholdId = base.household_person_id;
        } else {
          const creatorHp = persons.find(
            p => (p.connected_user_id === base.user_id || p.user_id === base.user_id) &&
                 p.household_id === hp?.household_id,
          );
          otherPersonHouseholdId = creatorHp?.id ?? base.household_person_id;
        }
        return {
          ...base,
          household_person: hp ? { id: hp.id, name: hp.name, email: hp.email, user_id: hp.user_id, household_id: hp.household_id } : undefined,
          creator,
          otherPersonHouseholdId,
        };
      });
      setDebtEntries(debts.sort((a, b) => b.date.localeCompare(a.date)));

      // Invitations — join with persons and inviters
      const invs: HouseholdInvitation[] = rawInvs.filter(r => r[0]).map(r => {
        const hp = personMap.get(r[2]);
        const inviter = profileMap.get(r[1]);
        return {
          id: r[0], inviter_user_id: r[1], household_person_id: r[2],
          invited_email: r[3], invited_user_id: r[4] || undefined,
          status: r[5] as 'pending' | 'accepted' | 'declined',
          created_at: r[6] ?? '', updated_at: r[7] ?? '',
          household_person: hp ? { id: hp.id, name: hp.name } : null,
          inviter,
        };
      });
      setInvitations(invs.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e) {
      console.error('Error loading household data:', e);
    } finally {
      setLoading(false);
    }
  }, [user, sheetsService]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Household persons ────────────────────────────────────────────────

  const getOrCreateHouseholdId = async (): Promise<string> => {
    const existing = householdPersons.find(p => p.user_id === user?.id || p.connected_user_id === user?.id);
    if (existing?.household_id) return existing.household_id;

    const now = nowIso();
    const hid = newId();
    const hName = `${user?.user_metadata?.full_name || user?.email}'s Household`;
    await sheetsService!.appendRow('households', [hid, hName, user!.id, now, now]);

    const selfPid = newId();
    try {
      await sheetsService!.appendRow('household_persons', [
        selfPid, user!.id, hid,
        user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Me',
        user?.email ?? '', user!.id, 'true', now, now,
      ]);
    } catch (e) {
      // Don't leave an orphan household with no member rows. Best-effort
      // cleanup; if this also fails the user gets a clear error and can
      // try again — the household row will get reused next time.
      try { await sheetsService!.delete('households', hid); } catch { /* swallow */ }
      throw e;
    }
    return hid;
  };

  const addHouseholdPerson = async (personData: Omit<HouseholdPerson, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !sheetsService) return;
    const hid = personData.household_id ?? await getOrCreateHouseholdId();
    const now = nowIso();
    const pid = newId();
    const row: HouseholdPerson = {
      id: pid, user_id: user.id, household_id: hid,
      name: personData.name, email: personData.email,
      connected_user_id: undefined, include_in_household_view: true,
      created_at: now, updated_at: now,
    };
    await sheetsService.appendRow('household_persons', [
      pid, user.id, hid, personData.name, personData.email ?? '',
      '', 'true', now, now,
    ]);
    if (personData.email) await inviteUser(pid, personData.email);
    await loadData();
  };

  const updateHouseholdPerson = async (id: string, data: Partial<HouseholdPerson>) => {
    if (!sheetsService) return;
    await sheetsService.updateById('household_persons', id,
      Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])));
    setHouseholdPersons(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const deleteHouseholdPerson = async (id: string) => {
    if (!sheetsService) return;
    setHouseholdPersons(prev => prev.filter(p => p.id !== id));
    await sheetsService.delete('household_persons', id);
  };

  // ── Debt entries ─────────────────────────────────────────────────────

  const addDebtEntry = async (debtData: Omit<DebtEntry, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'household_person'>) => {
    if (!user || !sheetsService) return;

    // If an expense_id already has a debt entry, update instead
    if (debtData.expense_id) {
      const existing = debtEntries.find(d => d.expense_id === debtData.expense_id);
      if (existing) return updateDebtEntry(existing.id, debtData);
    }

    const now = nowIso();
    const id = newId();
    await sheetsService.appendRow('debt_entries', [
      id, user.id, debtData.household_person_id, String(debtData.amount),
      debtData.currency, debtData.description ?? '', debtData.date,
      debtData.type, debtData.expense_id ?? '',
      debtData.split_method ?? '', debtData.split_value != null ? String(debtData.split_value) : '',
      String(debtData.resolved ?? false), now, now,
    ]);
    await loadData();
  };

  const updateDebtEntry = async (id: string, data: Partial<DebtEntry>) => {
    if (!sheetsService) return;
    const { household_person, creator, otherPersonHouseholdId, id: _id, user_id, created_at, updated_at, ...updateData } = data;
    const updates = Object.fromEntries(Object.entries(updateData).map(([k, v]) => [k, String(v ?? '')]));
    await sheetsService.updateById('debt_entries', id, updates);
    setDebtEntries(prev => prev.map(d => d.id === id ? { ...d, ...data, updated_at: nowIso() } : d));
  };

  const deleteDebtEntry = async (id: string) => {
    if (!sheetsService) return;
    setDebtEntries(prev => prev.filter(d => d.id !== id));
    await sheetsService.delete('debt_entries', id);
  };

  // ── Invitations ──────────────────────────────────────────────────────

  const inviteUser = async (householdPersonId: string, email: string) => {
    if (!user || !sheetsService) return;
    // Capture the previous email so we can revert if the invitation row write fails.
    const previousEmail = householdPersons.find(p => p.id === householdPersonId)?.email ?? '';
    await sheetsService.updateById('household_persons', householdPersonId, { email });
    const now = nowIso();
    const iid = newId();
    try {
      await sheetsService.appendRow('household_invitations', [
        iid, user.id, householdPersonId, email, '', 'pending', now, now,
      ]);
    } catch (e) {
      // Revert the email change so we don't leave a person row pointing at
      // an address that has no matching invitation row.
      try {
        await sheetsService.updateById('household_persons', householdPersonId, { email: previousEmail });
      } catch { /* best-effort */ }
      throw e;
    }
    await loadData();
  };

  const acceptInvitation = async (invitationId: string) => {
    if (!user || !sheetsService) return;
    const inv = invitations.find(i => i.id === invitationId);
    if (!inv) return;
    await sheetsService.updateById('household_persons', inv.household_person_id, { connected_user_id: user.id });
    try {
      await sheetsService.updateById('household_invitations', invitationId, { status: 'accepted', invited_user_id: user.id });
    } catch (e) {
      // Revert the connected_user_id so the user isn't half-joined: a
      // pending invitation is a recoverable state, but a person row
      // claiming connection without a matching accepted invitation isn't.
      try {
        await sheetsService.updateById('household_persons', inv.household_person_id, { connected_user_id: '' });
      } catch { /* best-effort */ }
      throw e;
    }
    await loadData();
  };

  const declineInvitation = async (invitationId: string) => {
    if (!user || !sheetsService) return;
    await sheetsService.updateById('household_invitations', invitationId, { status: 'declined', invited_user_id: user.id });
    setInvitations(prev => prev.map(i => i.id === invitationId ? { ...i, status: 'declined' as const, invited_user_id: user.id } : i));
  };

  return {
    householdPersons, debtEntries, invitations, loading,
    addHouseholdPerson, updateHouseholdPerson, deleteHouseholdPerson,
    addDebtEntry, updateDebtEntry, deleteDebtEntry,
    inviteUser, acceptInvitation, declineInvitation,
  };
};
