# Phase 4 — Path to publishable

A roadmap for taking this codebase from "works on the author's laptop" to "stranger on the internet can sign up and use it without surprises". Items below are grouped by what's required, what's product-decisional, and what's polish.

This plan was written alongside a small first wave of fixes; see the **Done in this commit** section at the bottom.

---

## Required before public launch

These are the things that, if left undone, will visibly bite real users. None require product decisions.

### 1. Fix the two Critical bugs in [BUGS.md](BUGS.md)
- **#1** — `deleteExpense` has no rollback / error handling. Wrap in try/catch, snapshot, restore on failure, surface a toast.
- **#2** — `addExpense` writes the expense row and then per-split debt rows non-atomically. On partial failure either delete the orphan expense or reload via `loadData()` so state matches the sheet.

Both are 30-line patches in [src/hooks/useExpenseData.ts](src/hooks/useExpenseData.ts).

### 2. Fix the High-severity correctness gaps that surface to users
- **Currency conversion silent fallthrough** ([useCurrencyConverter.ts:32-40](src/hooks/useCurrencyConverter.ts:32)) — change the return shape (`{ amount, converted: boolean }`) so callers can render a "rate unavailable" indicator instead of a wrong number with the wrong label.
- **CSV date-format silent default** — when auto-detect fails to parse N sample values as the default `YYYY-MM-DD`, force the user into the explicit-format dropdown.
- **Token expiry / 401 recovery** — wrap `request()` in `sheetsService` so a single 401 triggers silent re-auth and one retry instead of bubbling up as a generic error.

### 3. Atomicity of two-step household writes
- `acceptInvitation` ([useHouseholdData.ts:208-215](src/hooks/useHouseholdData.ts:208)) and `inviteUser` write two rows with no rollback. Wrap the second write in a try/catch that attempts to revert the first on failure.
- `getOrCreateHouseholdId` has the same shape; same fix.

### 4. Error boundary at the app root
A single uncaught exception currently white-screens the app. A React error boundary at the root that renders a fallback UI ("Something went wrong — refresh") plus the option to copy the stack would prevent silent disasters.

### 5. Bundle size
The current build emits a single 1.1 MB JS chunk. Vite warns about it on every build. Configure `build.rollupOptions.output.manualChunks` to split out:
- vendor (react, react-dom, react-router-dom)
- recharts (300+ KB on its own)
- shadcn primitives (radix-ui)

### 6. LICENSE
The repo has none. Pick one before publishing — MIT is the default for shadcn/Vite projects and what the underlying deps use.

### 7. User-facing README
The current README is dev-only. Add a top section that explains, in plain language: what this app does, what data goes where, what permissions Google asks for and why, and a single "try it" link once you have a hosted URL.

---

## Needs a product decision (deferred)

These should not be implemented without input from the project owner.

### A. Hosting / deployment
- Where does it live? Netlify, Vercel, Cloudflare Pages, GitHub Pages all work for a static SPA.
- Custom domain or subdomain on the author's existing domain?
- The OAuth client's authorised origins must list the prod domain — this is a one-time GCP config step.

### B. Privacy / legal
- Does the app collect any data outside the user's own spreadsheet? Today: no. If that stays true, a one-paragraph privacy notice ("we don't store your data; your data stays in your Google Drive") is sufficient.
- Terms of service: probably not needed for a no-backend personal-finance tool, but confirm.
- Google's OAuth verification: required before the consent screen leaves "Testing" mode and unknown users can sign in. Submit when ready to leave private beta.

### C. Telemetry / error tracking
- Sentry? Plausible? Nothing? Today the app has no observability — every error is a `console.error`. Picking *anything* (even a self-hosted minimal logger) lets you find issues users won't report.
- Analytics: do you want to know how many users you have? If yes, Plausible is privacy-friendly and free for small sites.

### D. Branding & marketing
- App name in the consent screen, favicon, OG image, social share metadata.
- A short demo video or screenshot in the README.

### E. Multi-currency exchange rate freshness
- Today, `exchange_rates` is a sheet tab the user must populate. For a publishable app, either (a) ship a default seeded set, (b) integrate a free FX API, or (c) make the limitation explicit in onboarding.

---

## Nice-to-haves (post-launch)

- Automated tests. Even a few unit tests for `householdScope`, `useCurrencyConverter`, and the CSV parser would catch most regressions. Vitest plays well with Vite.
- CI: GitHub Actions running `npm run build` and `npm run lint` on every PR.
- The Medium-severity items in BUGS.md (parse-error swallowing surface, CSV row-count cap, header casing in re-parse, retry amplification under 429).
- Component splits deferred from Phase 2c — `ExpenseList` (731 LOC), `DebtEntriesList` (766), `FileUpload` (684), `DashboardCharts` (651), `Index.tsx` tab orchestration.
- Per-user data export ("download my data as JSON") — easy because everything's already in a sheet you control.
- Offline support — the app is a pure SPA hitting Google APIs; a service worker that caches the shell would let it open offline. Mutations would still need network.
- Make rate limiter aware of bulk operations (CSV upload N rows fans out N appendRow calls today).

---

## Suggested rollout sequence

1. **Wave 1 (this commit)** — items 1, 4, 5, 6, 7 above. Critical bug fixes, error boundary, bundle split, license, user-facing README. No product decisions.
2. **Wave 2** — items 2, 3 above. Stronger correctness on edges (currency, dates, token, atomicity).
3. **Wave 3** — pick a host (A), add minimal observability (C), submit OAuth verification (B), launch a quiet beta.
4. **Wave 4** — tests, CI, FX freshness, the deferred component splits.

---

## Done in wave 1

- [BUGS.md #1](BUGS.md) Critical: `deleteExpense` rollback + error handling — fixed.
- [BUGS.md #2](BUGS.md) Critical: `addExpense` atomicity + error handling — fixed.
- Root `<ErrorBoundary>` added in [src/App.tsx](src/App.tsx).
- Bundle split into vendor / recharts / radix chunks via `manualChunks` in [vite.config.ts](vite.config.ts).
- [LICENSE](LICENSE) — MIT.
- README rewritten with a user-facing top section.

## Done in wave 2

- [BUGS.md #3](BUGS.md) High: `acceptInvitation` and `inviteUser` are now atomic-on-failure — second write is wrapped in try/catch, first write is reverted on failure.
- [BUGS.md #6](BUGS.md) High: currency conversion no longer fails silently. It still returns the unconverted amount (non-breaking) but now warns once per missing pair and exposes `isRateAvailable(from, to)` for callers that want to gate UI.
- [BUGS.md #7](BUGS.md) High: CSV auto-detect now samples date cells before committing to YYYY-MM-DD; if the format doesn't match, the user is forced into the column-mapping dialog with an explicit prompt.
- [BUGS.md #8](BUGS.md) High: token expiry now handled. Proactive refresh at `expires_in - 60s`, plus a 401-retry path inside `GoogleSheetsService.request()` that awaits a silent re-auth and retries the request once.

## Still open / next waves

- BUGS.md #4 (stale 30s row-index cache), #5 (`updateExpense` split race), #9 (non-atomic `getOrCreateHouseholdId`), and the Medium/Low items.
- Wire `isRateAvailable` into the display call sites that render multi-currency totals so the user actually sees a "rate unknown" indicator instead of a lurking warning in the console.
- Wave 3 product-decision items (hosting, telemetry, OAuth verification, branding).
