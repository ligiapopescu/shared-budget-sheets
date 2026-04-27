# Shared Budget Sheets

A household budget tracker where **your data lives in your own Google Spreadsheet**. Track expenses, income, savings, and shared debts without ever sending a row to a server we control — the browser talks straight to the Google Sheets and Drive APIs.

## What it does

- Track expenses and income with multi-currency support and per-category grouping.
- Bulk-import expenses from CSV files; rules can auto-categorise, split, or delete rows by merchant or description.
- Share a budget with household members. Invitees accept by email; once joined they see the same expenses, income, savings, and debt entries.
- Track who owes whom — split any expense across people, mark debts resolved, see per-person balances.
- Track savings accounts (cash or stocks) with monthly snapshots.
- Dashboard with month-over-month spending trends, category breakdown, and income vs. expense charts.

## Why a spreadsheet backend

- **You own the data.** It's a Google Spreadsheet in your Drive. You can open it, share it, audit it, export it, or delete it without our cooperation.
- **No service to trust.** There's no server collecting your finances. The app is a static SPA; auth and storage are with Google.
- **Works with what you already have.** No signup, no separate password, no extra account.

What you grant: read/write access to spreadsheets the app creates (`drive.file` scope — Drive can't see your other files), plus your email and name for the profile screen.

---

## Try it locally

You'll need a Google Cloud OAuth client to run it yourself.

### 1. One-time GCP setup

1. In [Google Cloud Console](https://console.cloud.google.com/), enable the **Sheets API** and **Drive API**.
2. Create an **OAuth 2.0 Web Client ID**.
   - Authorised JavaScript origins: `http://localhost:8080`
   - Authorised redirect URIs: `http://localhost:8080`
3. On the OAuth consent screen, add scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/drive.file`.
4. While in **Testing** mode, add your own email as a test user.

### 2. Run

```bash
cp .env.example .env          # paste your VITE_GOOGLE_CLIENT_ID
npm install
npm run dev                   # http://localhost:8080
```

### 3. Build

```bash
npm run build                 # outputs dist/
npm run preview               # serve the production build locally
```

---

## Architecture

```
Browser (React 18 + Vite + shadcn-ui)
  ├── AuthContext            Google OAuth token (in-memory) + spreadsheet linking
  ├── GoogleSheetsService    All CRUD via Sheets REST API v4
  ├── DriveService           Create / find / share spreadsheets via Drive API v3
  └── 16 sheet tabs          One tab per "table"; row 1 = headers; col A = id
```

Everything is stored as strings in the sheet; hooks deserialize on read. Full architecture, feature map, and conventions live in [CLAUDE.md](CLAUDE.md). Known issues are tracked in [BUGS.md](BUGS.md). The roadmap to a public release is in [PHASE4_PLAN.md](PHASE4_PLAN.md).

## License

[MIT](LICENSE).

---

## Project status

This started as a personal-use tool and is being prepared for public release. The cleanup and refactoring milestones are done; the path to "publishable" is laid out in [PHASE4_PLAN.md](PHASE4_PLAN.md). Contributions and issues welcome.

| Phase | Status |
|---|---|
| 1 — Cleanup (dead code / deps) | ✅ |
| 2 — Refactor (structure, conventions) | ✅ |
| 3 — Docs & bug audit | ✅ |
| 4 — Publish-ready | 🚧 in progress (see [PHASE4_PLAN.md](PHASE4_PLAN.md)) |
