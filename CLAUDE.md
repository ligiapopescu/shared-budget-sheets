# CLAUDE.md

Reference doc for contributors (human or AI). Covers architecture, data model, feature map, and the conventions / foot-guns this codebase has accumulated.

---

## Architecture in one paragraph

Single-page React app. **No backend.** The browser authenticates with Google via OAuth2 implicit flow ([@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)) and talks directly to the **Sheets API v4** and **Drive API v3** using `fetch`. Every record lives in a Google Spreadsheet the user owns; sharing happens through the spreadsheet's own ACL. Tokens are held in memory only; the user profile is cached in `localStorage` so silent re-auth can run on reload.

```
Browser (React 18 + Vite + shadcn-ui)
  ├── AuthContext            OAuth token (in memory) + spreadsheet linking
  ├── GoogleSheetsService    All CRUD via Sheets REST API v4
  ├── DriveService           Create / find / share spreadsheets via Drive API v3
  └── 16 sheet tabs          One tab per "table"; row 1 = headers; col A = id
```

Stack: React 18, TypeScript, Vite, shadcn-ui, react-router-dom, Recharts, date-fns. **No state library** — `useState` + `useContext`.

---

## Data model

Authoritative source: [src/integrations/google/sheetSchema.ts](src/integrations/google/sheetSchema.ts). Every sheet tab declares its column order there; deserialize/serialize functions in hooks must match it exactly.

| Sheet tab | Scope | Purpose |
|---|---|---|
| `profiles` | global | One row per signed-in user |
| `categories` | per-user | Personal categories (used when user is not in a household) |
| `expenses` | per-user (filterable to household) | Expense records |
| `income` | per-user (filterable to household) | Income records |
| `households` | shared | Household metadata |
| `household_persons` | shared | Membership rows. `user_id` = creator, `connected_user_id` = invitee |
| `household_categories` | shared | Categories used inside a household |
| `household_category_groups` | shared | Groups (with icon + display order) of household categories |
| `debt_entries` | shared | IOUs and per-person expense splits. Linked to `expenses` via `expense_id` |
| `household_invitations` | shared | Pending/accepted/declined invites by email |
| `savings_accounts` | per-user | Savings vehicles (cash or stock) |
| `savings_snapshots` | per-user | Monthly balance/quantity records |
| `merchant_categories` | per-user | Learned merchant→category mappings for CSV upload |
| `exchange_rates` | shared | FX rates for currency conversion |
| `expense_automation_rules` | per-user | Pattern-based rules for delete/split during CSV upload |
| `user_category_mappings` | shared | Optional mapping from a user's personal categories to household ones |

All values are stored as **strings** in Sheets. Hooks deserialize numbers/booleans/dates on read.

### Household membership

A user is "in" a household if there's a `household_persons` row where their user id appears in either `user_id` (creator) or `connected_user_id` (invitee who accepted). Read filtering is centralised in [src/integrations/google/householdScope.ts](src/integrations/google/householdScope.ts):

- `loadHouseholdMembershipRows(svc, userId)` — raw rows
- `getHouseholdIdForUser(svc, userId)` — first household id for the user
- `getAllowedUserIds(svc, userId, includeHousehold)` — `Set<userId>` for read filters

Use these helpers — never re-implement the `r[1] === user.id || r[5] === user.id` filter.

---

## Feature map

### Auth & spreadsheet setup
[src/pages/Auth.tsx](src/pages/Auth.tsx), [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx), [src/pages/SpreadsheetSetup.tsx](src/pages/SpreadsheetSetup.tsx). Google OAuth implicit flow → user can either create a fresh spreadsheet (Drive API) or paste an existing URL/ID. Tokens in memory; profile cached in `localStorage`.

### Expense tracking
[src/components/expense/ExpenseList.tsx](src/components/expense/ExpenseList.tsx) + [ExpenseForm.tsx](src/components/expense/ExpenseForm.tsx) + [ExpenseItem.tsx](src/components/expense/ExpenseItem.tsx). Inline-edit cells, multi-currency display, optional household scope. Data via [useExpenseData()](src/hooks/useExpenseData.ts) (single `batchGet` for the whole expense + categories + debts graph).

### CSV upload + auto-categorisation
[src/components/expense/FileUpload.tsx](src/components/expense/FileUpload.tsx) + [src/components/file-upload/](src/components/file-upload/). Column mapping dialog, learned merchant→category lookup, automation rules applied before review screen. Bulk split / delete / category change on the review screen. Mapping persisted to `sessionStorage`.

### Automation rules
[src/components/settings/AutomationRulesManager.tsx](src/components/settings/AutomationRulesManager.tsx) + dialogs. Pattern matches on merchant or description, can split across household members. Toggleable. Loaded by [useAutomationRules()](src/hooks/useAutomationRules.ts).

### Income tracking
[src/components/income/](src/components/income/) — list, form, item. Same shape as expenses minus categories/splits. Hook: [useIncomeData()](src/hooks/useIncomeData.ts).

### Categories
- **Personal**: [src/components/CategoryManager.tsx](src/components/CategoryManager.tsx), `categories` sheet, scoped by `user_id`.
- **Household**: [src/components/household/HouseholdCategoryManager.tsx](src/components/household/HouseholdCategoryManager.tsx) + [CategoryGroupItem.tsx](src/components/household/CategoryGroupItem.tsx), `household_categories` + `household_category_groups`.
- **Mapping**: when a user joins a household, [CategoryMappingDialog](src/components/household/CategoryMappingDialog.tsx) lets them link old personal categories to household ones (`user_category_mappings`).

### Household sharing
[src/components/debt/DebtTracker.tsx](src/components/debt/DebtTracker.tsx) is the hub. Invite-by-email creates a pending `household_invitations` row + a `household_persons` shell. Acceptance flips both rows. The header toggle `Include household data` switches `useExpenseData/useIncomeData/useSavingsData` between personal-only and household-wide views via the `getAllowedUserIds` helper.

### Debt tracking & splits
[src/components/debt/DebtEntriesList.tsx](src/components/debt/DebtEntriesList.tsx) + [src/pages/DebtManagement.tsx](src/pages/DebtManagement.tsx). Debts can be standalone or linked to a specific expense (`expense_id`). Split methods: `amount` (fixed) or `percentage`. `type` is `'owe_me' | 'i_owe'`. `resolved` flag toggles settled debts.

### Savings
[src/components/savings/SavingsGoals.tsx](src/components/savings/SavingsGoals.tsx) + dialogs. Two record types per account: cash balance or stock holding (qty + price). Snapshots are monthly (keyed by month + year). Hook: [useSavingsData()](src/hooks/useSavingsData.ts).

### Dashboard
[src/components/dashboard/](src/components/dashboard/). Recharts-based: trend, savings, income vs expense, category breakdown. Fixed-expenses detector identifies merchants appearing in ≥3 consecutive months. All derivations are in-memory; no separate sheet.

### Currency
[src/hooks/useCurrencyConverter.ts](src/hooks/useCurrencyConverter.ts) — direct rate, falling back to USD pivot. Display currency is a per-user pref. Symbol map is shared in [src/constants/currencies.ts](src/constants/currencies.ts).

### Settings & display preferences
[src/pages/Settings.tsx](src/pages/Settings.tsx). Date format, number format, currency — all persisted to `localStorage` keyed by user id (see `useDateFormatPreference`, `useNumberFormatPreference`, `useCurrencyPreference`).

---

## Conventions worth preserving

### Constants over inline literals

- **Currencies**: import from [src/constants/currencies.ts](src/constants/currencies.ts) and use the [`<CurrencySelectItems />`](src/components/CurrencySelectItems.tsx) component instead of pasting `<SelectItem value="USD">…</SelectItem>` blocks.
- **Debt type labels**: `DEBT_TYPE_LABELS` from [src/constants/debtTypes.ts](src/constants/debtTypes.ts) — never write `entry.type === 'owe_me' ? 'They owe me' : 'I owe them'` inline.
- **Sheet names**: the `SheetName` string-literal union in [sheetSchema.ts](src/integrations/google/sheetSchema.ts) already type-checks every call into `GoogleSheetsService`. No need for a wrapper `SHEET_NAMES` constant.

### Inline-edit cells

Use [`useInlineEdit<T>()`](src/hooks/useInlineEdit.ts) for any DataTable cell-edit flow. **Critical**: when you parse the cell key into `itemId-columnId`, always use `lastIndexOf('-')` (UUIDs contain dashes) — `useInlineEdit.parseEditingCell()` does this correctly. A `split('-')[1]` will silently pull the wrong segment of a UUID.

### Optimistic updates

Pattern across all CRUD hooks:

```ts
const snapshot = state.find(...);
setState(prev => optimisticallyUpdated(prev));
try {
  await sheetsService.someCall();
} catch (e) {
  if (snapshot) setState(prev => rollback(prev, snapshot));
  toast({ variant: 'destructive', ... });
  throw e;  // let caller decide; don't swallow
}
```

If you write a new mutation hook, follow the same shape. Don't `setState` inside `try` after the await — that defeats the optimism.

### Type definitions

Per-domain files under [src/interfaces/](src/interfaces/): `category.ts`, `expense.ts`, `income.ts`, `debt.ts`, `household.ts`, `savings.ts`, `household-categories.ts`, `household-category-groups.ts`. The root [src/interfaces.ts](src/interfaces.ts) is a barrel re-export — keep it that way; don't add new types directly to it.

`ExpenseSplit` lives in `expense.ts` and only there. It used to be duplicated in three places — don't reintroduce a local copy.

### Component organisation

Components are grouped by domain folder under [src/components/](src/components/):
- `expense/`, `income/`, `dashboard/`, `debt/`, `savings/`, `household/`, `settings/`, `file-upload/`
- `ui/` — shadcn primitives only, leave alone
- root — cross-cutting only (AppHeader, AppNavigation, ProtectedRoute, CategoryManager/Select, CurrencySelector/SelectItems, DatePickerInput)

When adding a component, put it in the matching domain folder. Only fall back to root if it genuinely spans 3+ domains.

### Hooks layering

Every CRUD hook is `useXData()` and returns an object with `loading`, the data arrays, and `add/update/delete` functions. Loading is gated on `useAuth().sheetsService` being non-null — don't fire requests before that.

For household-scoped hooks, accept `includeHouseholdData = false` as the only argument and pass it through `getAllowedUserIds`.

---

## Foot-guns / things that have bitten us

1. **UUID parsing with `split('-')`** — always use `lastIndexOf('-')` when splitting `${id}-${field}` keys. This bug existed in `DebtManagement` until commit `98db1de` and silently fell through to a "send all fields" fallback that masked the failure.
2. **The 30-second row-index cache** in [sheetsService.ts](src/integrations/google/sheetsService.ts) (`findRowByIdIndex`) is keyed by id but indexes are positional. After a concurrent insert/delete by another household member, cached indexes are stale and an `updateById` will write to the wrong row. Aware of, not fixed — see BUGS.md.
3. **No persisted token** — full auth state lives in memory and `localStorage`-cached profile. A page reload triggers silent re-auth; if it fails the app shows a stuck loading state. Do not attempt to persist the access token to `localStorage`.
4. **All sheet values are strings** — when adding a numeric/boolean column, write `String(x)` on serialize and `parseFloat(x) || 0` (or `r[i] === 'true'`) on deserialize. Don't trust `parseFloat` to detect a malformed cell — it silently returns `NaN`.
5. **Currency conversion silently returns un-converted amount** when neither direct nor pivot rate exists ([useCurrencyConverter.ts:33–41](src/hooks/useCurrencyConverter.ts:33)). The user sees the original number labelled with the target currency — track via BUGS.md before touching.
6. **Optimistic deletes in `useExpenseData.deleteExpense` have no rollback** — known critical bug. If you copy a CRUD hook from there, fix the rollback at the same time.
7. **Two-step writes are not atomic** — invitation acceptance, household creation, expense+debt-entry insert all do sequential writes with no rollback. Sheets has no transactions; the best we can do is ordering writes such that the more recoverable side fails first.
8. **CSV date format is auto-guessed** — when headers are detected automatically, [FileUpload.tsx](src/components/expense/FileUpload.tsx) defaults to `YYYY-MM-DD`. A DD/MM/YYYY CSV will be parsed off by a month silently. Always offer the user an explicit format dropdown if you change this code path.

---

## Local development

```bash
cp .env.example .env          # add VITE_GOOGLE_CLIENT_ID
npm install
npm run dev                   # http://localhost:8080
npm run build
npm run lint
```

The dev server must run on `http://localhost:8080` because the OAuth client's authorised origins are configured to that exact URL.

---

## Where to look for what

| Question | Look at |
|---|---|
| What columns does sheet X have? | [sheetSchema.ts](src/integrations/google/sheetSchema.ts) |
| How do I read/write rows? | [sheetsService.ts](src/integrations/google/sheetsService.ts) — `getAll`, `getWhere`, `insert`, `updateById`, `delete`, `upsert` |
| How do I scope to the current household? | [householdScope.ts](src/integrations/google/householdScope.ts) |
| How is auth wired? | [AuthContext.tsx](src/contexts/AuthContext.tsx) |
| What does the app actually do? | [Index.tsx](src/pages/Index.tsx) (top-level tabs) and the feature map above |
| What are the known bugs? | [BUGS.md](BUGS.md) |

---

## What's not here yet

- No automated tests of any kind.
- No CI.
- No error reporting / observability — failures surface as toasts and `console.error`.
- The token refresh path is best-effort silent re-auth; there is no proactive refresh timer.
