# Known bugs

A code-reading audit done during Phase 3 of the cleanup. Findings are ranked by severity. The Critical bugs and the High items called out in Phase 4 wave 1 + wave 2 are now fixed; this file is kept as the running ledger.

**Status legend:** ✅ fixed · 🚧 partial · ⏳ open

One bug found during the audit (the `split('-')` UUID parsing in `DebtManagement`) was already fixed in commit `98db1de`.

Severity scale:
- **Critical** — data loss, auth bypass, wrong row written
- **High** — wrong data shown to user, half-applied writes, silent failures
- **Medium** — UX gaps, edge cases, error messaging
- **Low** — nits / suspected

---

## Critical

### 1. ✅ `deleteExpense` has no rollback and no error handling
**Fixed** in Phase 4 wave 1 (commit `50736ae`). Snapshots state, restores on failure, surfaces a toast.
[`src/hooks/useExpenseData.ts:235-241`](src/hooks/useExpenseData.ts:235)

```ts
const deleteExpense = async (id: string) => {
  if (!sheetsService) return;
  setExpenses(prev => prev.filter(e => e.id !== id));   // optimistic remove
  const debtRows = await sheetsService.getWhere('debt_entries', 'expense_id', id, r => r);
  await Promise.all(debtRows.map(r => sheetsService.delete('debt_entries', r[0])));
  await sheetsService.delete('expenses', id);
};
```

State mutates first, three awaited calls follow with no try/catch. If any of the three fails, the expense is gone from the UI but still on the sheet — the user thinks it's deleted, refreshes, and it reappears. Worse, the linked `debt_entries` may be partially deleted, leaving orphan splits or a half-deleted expense.

**Fix shape**: snapshot, optimistic remove, `try { … } catch { restore snapshot; toast error; throw }`. Match the pattern used by `addIncome`/`updateIncome`.

### 2. ✅ `addExpense` writes split debt-entries without transactional fallback
**Fixed** in Phase 4 wave 1 (commit `50736ae`). Three-phase write with best-effort cleanup of partial writes; reloads from Sheets on failure so local state matches.
[`src/hooks/useExpenseData.ts:121-176`](src/hooks/useExpenseData.ts:121)

The expense row is appended first, then each split's `debt_entries` row, then state is updated. There's no try/catch around any of this. If the expense row writes successfully but a debt_entries write fails partway through:

- The expense exists on the sheet.
- Some splits exist; some don't.
- The user sees no toast.
- Local state is never updated, so the UI silently disagrees with the sheet.

**Fix shape**: wrap the multi-step write in try/catch, log specifically which step failed, surface a toast, and on the catch path either delete the orphaned expense row or accept the partial state and reload via `loadData()`.

---

## High

### 3. ✅ `acceptInvitation` is non-atomic
**Fixed** in Phase 4 wave 2. Both `acceptInvitation` and `inviteUser` now wrap the second write in try/catch and revert the first write on failure.
[`src/hooks/useHouseholdData.ts:208-215`](src/hooks/useHouseholdData.ts:208)

```ts
await sheetsService.updateById('household_persons', inv.household_person_id, { connected_user_id: user.id });
await sheetsService.updateById('household_invitations', invitationId, { status: 'accepted', invited_user_id: user.id });
```

If the first call succeeds and the second fails, the user's `user_id` is in the household_persons row but the invitation is still in `pending`. The user is in the household, but their inbox still shows the invitation as outstanding. Symmetric problem on `inviteUser` (no rollback if the second of two writes fails).

**Fix shape**: try/catch the second write and on failure, attempt to revert the first write before surfacing the error. Sheets has no transactions; ordering matters — write the harder-to-undo side first.

### 4. Stale 30-second row-index cache can write the wrong row
[`src/integrations/google/sheetsService.ts:97-108`](src/integrations/google/sheetsService.ts:97)

`findRowByIdIndex` caches the array of ids per sheet for 30 seconds. The cached **index** is positional. If another household member inserts or deletes a row during that window, every subsequent `updateRow` from the cache hit will target the wrong sheet row.

**Fix shape**: either invalidate on every read (kills the perf benefit) or stop using positional indexes — use the id column for matching directly and accept a per-call `getRange` cost. Cheapest mitigation: shorten TTL to a few seconds or cache only within the duration of a single user gesture.

### 5. `updateExpense` race deletes splits before re-creating them
[`src/hooks/useExpenseData.ts:178-233`](src/hooks/useExpenseData.ts:178)

When edited splits change, the hook deletes all existing `debt_entries` for the expense and then writes the new ones. Two concurrent `updateExpense` calls for the same expense (e.g., two tabs, or the user clicks fast) can interleave so the second call's "delete old splits" wipes the first call's freshly-written splits.

**Fix shape**: either guard the operation with an in-flight `Set<expenseId>` and reject overlap, or compute a diff (delete only debt rows that are leaving, insert only ones that are new) so the operation is idempotent under interleaving.

### 6. 🚧 Currency conversion silently returns un-converted amount
**Partial** in Phase 4 wave 2. The function still returns the unconverted amount on a missing rate (so the API stays non-breaking), but it now `console.warn`s once per missing pair and exposes a new `isRateAvailable(from, to)` helper that callers can use to render a "rate unknown" indicator. Updating display call sites is open work.
[`src/hooks/useCurrencyConverter.ts:32-40`](src/hooks/useCurrencyConverter.ts:32)

If neither a direct rate (A→B) nor a USD-pivot pair (A→USD and USD→B) exists, `convertAmount` returns `amount` unchanged. The caller then renders it labelled with the target currency. The user sees `$50` for what is actually `€50` and has no way to know.

**Fix shape**: have the function return `{ amount, converted: boolean }` (or throw / return null). Callers can then surface a "rate unavailable" indicator or fallback to showing the original currency code.

### 7. ✅ CSV date format is silently auto-defaulted
**Fixed** in Phase 4 wave 2. `processCSVFile` samples up to 5 date cells; if fewer than half look like ISO `YYYY-MM-DD`, the auto-process path is skipped and the user is forced into the column-mapping dialog with a toast prompting them to pick the format explicitly.
[`src/components/expense/FileUpload.tsx`](src/components/expense/FileUpload.tsx) (around the auto-detect path)

When the column-mapping dialog auto-detects headers, the date format defaults to `YYYY-MM-DD`. A CSV in `DD/MM/YYYY` is then parsed as `YYYY-MM-DD` and silently produces wrong dates (off by month, or completely garbage). The user sees expenses on the wrong day with no warning.

**Fix shape**: when auto-detecting, sample N values, and if any fails to parse as the default format, force the user into the explicit-mapping dialog with a "couldn't auto-detect format" message.

### 8. ✅ Token expiry isn't proactively detected
**Fixed** in Phase 4 wave 2. AuthContext now (a) schedules a silent re-auth at `expires_in - 60s` after every successful token, and (b) exposes `refreshAccessTokenAsync()` to `GoogleSheetsService`, which calls it from `request()` on a 401 and retries the request once with the new token. Refresh timer is cleared on sign-out; pending 401 retries reject if the refresh fails.
[`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) (token plumbing)

The OAuth implicit flow gives a short-lived access token (3600s). Nothing in `AuthContext` proactively refreshes it; the silent re-auth path runs on mount and on certain failures, but a long-lived browser tab will eventually fire requests with an expired token. Sheets API returns 401, the request layer doesn't have a 401-handler, the error bubbles up as a generic toast or is swallowed.

**Fix shape**: either set a refresh timer at `expires_in - 60s` after each successful login, or wrap `request()` in `sheetsService` with a single 401-recovery path that triggers silent re-auth and retries once.

---

## Medium

### 9. `getOrCreateHouseholdId` writes household + person separately
[`src/hooks/useHouseholdData.ts:108-124`](src/hooks/useHouseholdData.ts:108)

Two `appendRow` calls with no error handling. If the second fails, the household exists but has no member. Returns the household id either way, so callers happily proceed to write data into a phantom household. Less likely to bite (small write, fast succession) but the same shape as bug #3.

### 10. `parseFloat`/`parseInt` errors are swallowed
Multiple deserializers across hooks use `parseFloat(r[i]) || 0` and `parseInt(r[i]) || 0`. If a sheet cell is corrupted (e.g., the user manually edited a number cell to "abc"), the row deserializes with that field as `0`. There's no way for the app to surface "this row had a malformed number." The display shows `0`, which is a plausible value.

**Fix shape**: at the very least, `console.warn` when a numeric parse falls through to the default. Optional: collect a "rows we couldn't fully parse" list and surface a banner in the UI.

### 11. CSV header detection is case-sensitive in the re-parse path
[`src/components/expense/FileUpload.tsx`](src/components/expense/FileUpload.tsx) (header detection vs. mapping dialog)

`detectColumnIndices` lowercases headers; the column-mapping dialog re-reads the original casing of `lines[0]`. If a header has mixed case, the auto-detected index can be off-by-one when the dialog reopens.

### 12. CSV upload has no row-count cap
A 50k-row CSV will be parsed and held entirely in memory before review, then uploaded one `appendRow` at a time. Large uploads will lock the UI and may exhaust the Sheets API quota. No batching, no progress, no cap.

**Fix shape**: cap at e.g. 5000 rows with a UI warning, or batch uploads with `values:append` (which already accepts an array of rows).

---

## Low

### 13. `request()` retry can amplify load under rate limiting
[`src/integrations/google/sheetsService.ts:41-62`](src/integrations/google/sheetsService.ts:41)

A 429 triggers up to 4 retries with exponential backoff (1s/2s/4s) **per call**. A `Promise.all` that fans out 10 simultaneous calls can issue 40 retries when the API is throttling, making the throttle worse. No global concurrency limiter or shared backoff.

### 14. Several `useEffect`/`useCallback` dependencies are flagged by eslint
The lint warnings on missing `toast` deps in 5+ hooks are mostly cosmetic (the toast hook returns a stable identity), but two of them — `useEffect(... )` with `[user, sheetsService]` while internally using a stale `userId` closure — are worth a closer look. Audit before silencing.
