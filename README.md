# Shared Budget Sheets

Household budget tracker where every record lives in a Google Spreadsheet the user owns. No backend, no database — the browser talks directly to Google Sheets and Drive APIs via native `fetch`.

Built with React 18 + TypeScript + Vite + shadcn-ui. Auth via Google OAuth2 implicit flow (`@react-oauth/google`).

---

## Setup

### 1. GCP (one-time)

1. Enable **Sheets API** and **Drive API** in [Google Cloud Console](https://console.cloud.google.com/).
2. Create an OAuth 2.0 Web Client ID.
   - Authorised JS origins: `http://localhost:8080` (add prod domain when deploying)
   - Authorised redirect URIs: `http://localhost:8080`
3. OAuth consent screen scopes: `openid email profile spreadsheets drive.file`
4. Add your email as a test user while in Testing mode.

### 2. Local

```bash
cp .env.example .env          # add your VITE_GOOGLE_CLIENT_ID
npm install
npm run dev                   # http://localhost:8080
```

---

## Architecture

```
Browser (React + Vite)
  ├── AuthContext              Google OAuth2 token (in memory) + spreadsheet linking
  ├── GoogleSheetsService      All CRUD via Sheets REST API v4
  ├── DriveService             Create / find / share spreadsheets via Drive API v3
  └── 16 sheet tabs            One tab per table, row 1 = headers, col A = id
```

All data is stored as strings in the sheet. No backend. Full reference in `CLAUDE.md` (generated in Phase 1 cleanup).

---

## Known gaps

- **Invite flow** (`InviteUserDialog`, `InvitationsList`) still references old join-link model — needs alignment with the new "paste spreadsheet URL" sharing approach.
- **Exchange rates** tab exists but is never populated — no live data source wired yet.
- **Multi-user concurrency** — 30s row-index cache can go stale with two simultaneous writers.
- **Silent login failure** — if token refresh fails on mount, user sees a bare login button with no explanation.

---

## TODO

### Phase 1 — Cleanup & Docs
- [ ] 1.1 Remove debug `console.log` statements (`DatePickerInput.tsx`, `FileUpload.tsx`)
- [ ] 1.2 Replace all `any` types with proper interfaces
- [ ] 1.3 Create `src/constants.ts` (sheet names, localStorage keys, magic numbers)
- [ ] 1.4 Add page-level Error Boundaries (`Index`, `DebtManagement`, `Settings`)
- [ ] 1.5 Create `CLAUDE.md` with full architecture reference
- [ ] 1.6 Remove or adopt `@tanstack/react-query` (installed but unused)

### Phase 2 — Refactoring
- [ ] 2.1 Consolidate Add/Edit dialog pairs → single form components (Savings, Automation, BulkSplit)
- [ ] 2.2 Split `ExpenseList.tsx` (731 lines)
- [ ] 2.3 Split `DebtEntriesList.tsx` (766 lines)
- [ ] 2.4 Split `FileUpload.tsx` (687 lines)
- [ ] 2.5 Split `DashboardCharts.tsx` (651 lines) + extract `useDashboardMetrics` hook
- [ ] 2.6 Centralize type definitions under `src/interfaces/`
- [ ] 2.7 Extract typed row parsers from hooks into `sheetSchema.ts`

### Phase 3 — Known Gaps
- [ ] 3.1 **[Human decision]** Invite flow UX — remove, repurpose as sharing guide, or keep for future?
- [ ] 3.2 **[Human decision]** Exchange rates — pick API source (frankfurter.app, manual entry, other)
- [ ] 3.3 Invalidate row-index cache immediately on write (concurrency fix)
- [ ] 3.4 Add "session expired" message when silent login fails on mount

### Phase 4 — Performance
- [ ] 4.1 Adopt React Query across all 16 data hooks
- [ ] 4.2 Memoize list components (`ExpenseList`, `IncomeList`, `DebtEntriesList`)
- [ ] 4.3 Virtualize long lists with `@tanstack/react-virtual`

### Phase 5 — Deployment
- [ ] 5.1 **[Human]** Add prod domain to GCP OAuth credentials
- [ ] 5.2 **[Human]** Set `VITE_GOOGLE_CLIENT_ID` in hosting env (Netlify/Vercel)
- [ ] 5.3 Add hosting config (`netlify.toml` or `vercel.json` with SPA redirect rules)
