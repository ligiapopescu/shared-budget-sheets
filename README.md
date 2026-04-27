# Shared Budget Sheets

A household budget tracker where **every record lives in a Google Spreadsheet the user owns**. No external database. The spreadsheet is human-readable, filterable, and shareable directly in Google Sheets. The React app adds a structured UI, charts, CSV upload, split-expense tracking, and savings monitoring on top.

This project is a full rewrite of `shared-spending-circles`, which used Supabase. Supabase has been removed entirely.

---

## Architecture at a glance

```
Browser (React + Vite + shadcn-ui + Tailwind)
  │
  ├── AuthContext          Google OAuth2 (implicit flow, token in memory)
  │
  ├── GoogleSheetsService  All reads/writes via Google Sheets REST API v4
  ├── DriveService         Spreadsheet create / find / share via Drive API v3
  │
  └── 16 sheet tabs        One tab per table, row 1 = headers, column A = id
```

All values are stored as strings in the sheet. Deserialization happens in JS. There is no backend — the browser talks directly to Google APIs.

---

## Tech stack

| Layer | Library |
|---|---|
| UI framework | React 18 + TypeScript + Vite |
| Components | shadcn-ui (Radix primitives + Tailwind CSS) |
| Charts | Recharts |
| Auth | `@react-oauth/google` (Google Identity Services) |
| Google APIs | native `fetch` — no SDK |
| IDs | `crypto.randomUUID()` / `uuid` npm package fallback |
| Routing | React Router v6 |

---

## One-time GCP setup (required before running)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **Enable APIs**: Sheets API + Drive API.
3. **Create OAuth 2.0 credentials**: APIs & Services → Credentials → Create Credentials → OAuth Client ID → Web application.
   - Authorised JS origins: `http://localhost:8080` (add production domain when deploying)
   - Authorised redirect URIs: `http://localhost:8080`
4. **OAuth consent screen**: add scopes `openid email profile spreadsheets drive.file`. Add your email as a test user while in Testing mode.
5. Copy the Client ID into `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
   ```

See `.env.example` for a template.

---

## Running locally

```bash
npm install
npm run dev        # http://localhost:8080
npm run build      # production build, zero TS errors expected
```

---

## Auth & spreadsheet setup flow

1. User clicks "Sign in with Google" → `AuthContext.initiateLogin()` → Google popup.
2. `onTokenSuccess(accessToken)`:
   - Fetches userinfo (`/oauth2/v3/userinfo`) → sets `user` in context.
   - If `localStorage["spreadsheet_id_{sub}"]` exists → silently reconnects (`sheetsService` is set, app loads normally).
   - If not → `spreadsheetId` and `sheetsService` remain `null`.
3. `ProtectedRoute` detects `user` set but `spreadsheetId` null → renders **`SpreadsheetSetup`** page.
4. User either:
   - **Creates** a new spreadsheet: `AuthContext.createNewSpreadsheet()` → Drive API creates the file, `initializeSpreadsheet()` adds 16 tabs + headers, ID saved to localStorage.
   - **Joins** an existing one: pastes a Google Sheets URL or bare ID → `AuthContext.connectToSpreadsheet(urlOrId)` → parses ID from URL if needed, initialises service, saves ID.
5. Once `spreadsheetId` is set in context, `ProtectedRoute` renders the app.

Tokens expire after 1 hour. On mount, if a cached user profile exists in localStorage, `triggerSilentLogin` (GIS `prompt: ''`) attempts a silent token refresh. `AuthContext.refreshToken()` can trigger this manually.

**Household sharing model**: one spreadsheet per family. The owner shares it via Drive (`DriveService.shareSpreadsheet`); members paste the URL in `SpreadsheetSetup` to connect to it. There is no invite-link flow — sharing is done out-of-band via Google Drive.

---

## Key source files

### Integration layer

| File | Role |
|---|---|
| `src/integrations/google/sheetSchema.ts` | `SHEET_SCHEMAS` — column header arrays for all 16 tabs. `colIndex(sheet, col)` for 0-based column lookup. `columnLetter(n)` for A1 notation. |
| `src/integrations/google/sheetsService.ts` | `GoogleSheetsService` class — all CRUD. Row-index cache (30s TTL). Exponential backoff on 429. `newId()` and `nowIso()` helpers exported here. |
| `src/integrations/google/driveService.ts` | `DriveService` — `createSpreadsheet`, `findSpreadsheetByTitle`, `shareSpreadsheet`. |
| `src/integrations/google/client.ts` | Re-exports everything from the three files above. Import from here in components and hooks. |

### Context

| File | Role |
|---|---|
| `src/contexts/AuthContext.tsx` | `GoogleUser`, `AuthContextType`, `AuthProvider`. Exposes `sheetsService`, `spreadsheetId`, `createNewSpreadsheet()`, `connectToSpreadsheet()`, `updateUserMetadata()`, `refreshToken()`. |

### Pages

| File | Role |
|---|---|
| `src/pages/Auth.tsx` | Single "Sign in with Google" button. |
| `src/pages/SpreadsheetSetup.tsx` | Shown when authenticated but no spreadsheet linked. Create or join. |
| `src/pages/Index.tsx` | Main dashboard — expenses, income, charts. |
| `src/pages/Settings.tsx` | Categories, automation rules, preferences. |
| `src/pages/DebtManagement.tsx` | Per-person debt and split-expense view. |

### Route guard

`src/components/ProtectedRoute.tsx` — three states:
- `loading` → spinner
- `!user` → redirect to `/auth`
- `user && !spreadsheetId` → render `<SpreadsheetSetup />`
- `user && spreadsheetId` → render children

---

## Spreadsheet structure (16 tabs)

| Sheet tab | Key columns |
|---|---|
| `profiles` | id, email, full_name, created_at, updated_at |
| `categories` | id, name, color, is_default, user_id, created_at |
| `expenses` | id, date, merchant, amount, currency, category_id, user_id, description, household_id, created_at, updated_at |
| `income` | id, date, source, amount, currency, user_id, description, household_id, created_at, updated_at |
| `households` | id, name, created_by, created_at, updated_at |
| `household_persons` | id, user_id, household_id, name, email, connected_user_id, include_in_household_view, created_at, updated_at |
| `household_categories` | id, household_id, name, color, is_default, group_id, created_at, updated_at |
| `household_category_groups` | id, household_id, name, color, icon, display_order, created_at, updated_at |
| `debt_entries` | id, user_id, household_person_id, amount, currency, description, date, type, expense_id, split_method, split_value, resolved, created_at, updated_at |
| `household_invitations` | id, inviter_user_id, household_person_id, invited_email, invited_user_id, status, created_at, updated_at |
| `savings_accounts` | id, user_id, name, account_type, currency, holding_type, stock_symbol, stock_name, description, household_id, created_at, updated_at |
| `savings_snapshots` | id, user_id, savings_account_id, month, year, balance, stock_quantity, stock_price_per_share, notes, household_id, created_at, updated_at |
| `merchant_categories` | id, merchant, category_id, user_id, last_used |
| `exchange_rates` | id, from_currency, to_currency, rate, updated_at |
| `expense_automation_rules` | id, user_id, rule_type, merchant_pattern, description_pattern, category_id, category_group_id, household_person_id, split_amount, split_method, is_active, created_at, updated_at |
| `user_category_mappings` | id, user_id, user_category_id, household_category_id, household_id, created_at |

Column order in each tab matches the array in `SHEET_SCHEMAS`. Column A is always `id`.

---

## Data layer patterns

### Reading

```ts
// Single sheet — all rows
const rows = await sheetsService.getAll('expenses', row => ({ id: row[0], amount: row[3] }));

// Filter by a column value
const mine = await sheetsService.getWhere('expenses', 'user_id', user.id, row => row);

// Multi-sheet in one HTTP call (preferred for startup reads)
const { expenses, income } = await sheetsService.batchGet(['expenses', 'income']);
```

### Writing

```ts
// Append a new row (id, created_at, updated_at auto-filled if passed as '')
await sheetsService.appendRow('expenses', [newId(), date, merchant, amount, ...]);

// Update specific columns by id (reads current row, merges, writes back)
await sheetsService.updateById('expenses', expenseId, { merchant: 'New Name' });

// Delete by id
await sheetsService.delete('expenses', expenseId);

// Upsert (e.g. monthly savings snapshot — match on account + month + year)
await sheetsService.upsert('savings_snapshots', ['savings_account_id', 'month', 'year'], record, serialize);
```

All hooks use **optimistic updates**: update React state immediately, fire the API call async, roll back on failure.

### Column indices

```ts
import { colIndex } from '@/integrations/google/client';
const amountCol = colIndex('expenses', 'amount'); // → 3
```

---

## Hooks

All hooks keep the same return shapes as the original Supabase project. Internal calls were replaced but signatures are unchanged — components do not need to know about the data source.

| Hook | Primary operation |
|---|---|
| `useExpenseData` | `batchGet` of 7 sheets; JS join of expenses + debt_entries + categories |
| `useIncomeData` | `getAll('income')` + JS filter by household members |
| `useHouseholdData` | `batchGet(['household_persons','debt_entries','household_invitations','profiles'])` |
| `useHouseholds` | Sequential `appendRow` — household first, then household_person |
| `useHouseholdStatus` | `getWhereMultiple('household_persons', r => r[1] === userId \|\| r[5] === userId)` |
| `useHouseholdCategories` | CRUD on `household_categories` filtered by `household_id` |
| `useHouseholdCategoryGroups` | CRUD on `household_category_groups` filtered by `household_id` |
| `useSavingsData` | `batchGet(['savings_accounts','savings_snapshots'])` |
| `useAutomationRules` | `getWhere('expense_automation_rules', 'user_id', userId)` |
| `useCurrencyConverter` | `getAll('exchange_rates')` |
| `useCurrencyPreference` | localStorage via `updateUserMetadata` |
| `useDateFormatPreference` | localStorage via `updateUserMetadata` |
| `useNumberFormatPreference` | localStorage via `updateUserMetadata` |

---

## localStorage keys

| Key | Value |
|---|---|
| `spreadsheet_id_{sub}` | Google Spreadsheet ID linked to this user |
| `user_meta_{sub}` | JSON: `{ full_name, preferred_currency, preferred_number_format, preferred_date_format }` |
| `cached_google_user` | JSON: `{ id, email, name, picture }` — used to show identity instantly on reload before token refresh |

---

## Rate limit strategy

- `batchGet` combines multi-sheet reads into a single HTTP call
- Row-index cache (30s TTL) avoids repeat column-A scans
- Optimistic updates avoid read-after-write round trips
- 429 → exponential backoff: 1s, 2s, 4s, max 3 retries, then throws
- Token expiry (1hr) → `refreshToken()` uses GIS `prompt: ''` silent flow

---

## What is NOT yet done / known gaps

- **`household_invitations` tab**: still in the schema and populated by `useHouseholdData`, but the UI invite flow (`InviteUserDialog`, `InvitationsList`) still references the old join-link model. These components may need updating to match the new "paste a spreadsheet URL" sharing model.
- **Exchange rates**: `exchange_rates` tab exists but the app does not yet populate it with live data. `useCurrencyConverter` reads whatever is in the sheet; rates must be entered manually or seeded.
- **Multi-user concurrency**: two users writing to the same spreadsheet simultaneously can cause row-index cache staleness. The 30s TTL mitigates most cases but is not a true conflict resolver.
- **Offline / no token**: if `triggerSilentLogin` fails on mount (expired Google session), the app falls back to showing the login button. No offline mode.
