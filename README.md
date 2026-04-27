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

## TODO

### Phase 1 — Cleanup
- [x] 1. Perform code cleanup: remove unused code or dependencies, console logs, etc.

### Phase 2 — Refactoring
- [x] 2. Establish a file system and consolidate the code, improve the components layer, add abstractization, implement overall best practices

### Phase 3 — Docs and UX scanning 
- [ ] 3. Identify the implemented features, check if there are any bugs obvious from the code perspective. Create docs for future work, to keep best practices in place

### Phase 4 - Publish ready
- [ ] 4. In the clean codebase, and with all the features identified, create an implementation plan to fill in the gaps, suggest relevant changes to make this project publishable
