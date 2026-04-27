/**
 * One-off migration from the old Supabase backend to a Google Spreadsheet.
 *
 * Reads each Supabase table, maps to the column order declared in
 * src/integrations/google/sheetSchema.ts, and appends rows via the Sheets
 * REST API. Idempotent: rows whose `id` already exists in the sheet are
 * skipped.
 *
 * Auth:
 *   - Supabase: SERVICE ROLE key (read-only here, but it bypasses RLS so we
 *     see all rows including test users).
 *   - Google: a short-lived OAuth access token that the user pastes from
 *     their browser dev tools after signing in to the app. Tokens last ~1h;
 *     if it expires mid-run, re-paste a fresh one and re-run.
 *
 * User-id remapping:
 *   The Supabase `auth.users` UUIDs aren't the same as the Google `sub`
 *   used by the new app. Strategy: find the profiles row whose email
 *   matches the Google account that just signed in, and remap that user's
 *   UUID -> Google sub everywhere it appears. Other users (test accounts
 *   that won't sign in) keep their Supabase UUIDs so cross-table FKs stay
 *   intact.
 *
 * Run:
 *   npm run migrate:dry-run   (counts what would be inserted; writes nothing)
 *   npm run migrate           (actually inserts)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SHEET_SCHEMAS, type SheetName } from '../src/integrations/google/sheetSchema';

dotenv.config({ path: '.env.migration' });

// ─── Env ─────────────────────────────────────────────────────────────────

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SPREADSHEET_ID,
  GOOGLE_ACCESS_TOKEN,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SPREADSHEET_ID || !GOOGLE_ACCESS_TOKEN) {
  console.error('Missing one of: SUPABASE_URL, SUPABASE_SERVICE_KEY, SPREADSHEET_ID, GOOGLE_ACCESS_TOKEN.');
  console.error('Populate .env.migration first.');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Supabase column orders ──────────────────────────────────────────────
//
// The Supabase column order differs from sheet schema for several tables
// (see the migration audit in CLAUDE.md / report). We declare both sides
// explicitly so we never rely on `SELECT *`.

const SUPABASE_COLUMNS: Record<SheetName, string[]> = {
  profiles:                   ['id', 'email', 'full_name', 'created_at', 'updated_at'],
  categories:                 ['id', 'name', 'color', 'user_id', 'is_default', 'created_at'],
  expenses:                   ['id', 'user_id', 'date', 'merchant', 'amount', 'category_id', 'description', 'currency', 'household_id', 'created_at', 'updated_at'],
  income:                     ['id', 'user_id', 'source', 'date', 'amount', 'currency', 'description', 'household_id', 'created_at', 'updated_at'],
  households:                 ['id', 'name', 'created_by', 'created_at', 'updated_at'],
  household_persons:          ['id', 'user_id', 'household_id', 'name', 'email', 'connected_user_id', 'include_in_household_view', 'created_at', 'updated_at'],
  household_categories:       ['id', 'household_id', 'name', 'color', 'is_default', 'group_id', 'created_at', 'updated_at'],
  household_category_groups:  ['id', 'household_id', 'name', 'color', 'icon', 'display_order', 'created_at', 'updated_at'],
  debt_entries:               ['id', 'user_id', 'household_person_id', 'amount', 'currency', 'description', 'date', 'type', 'expense_id', 'split_method', 'split_value', 'resolved', 'created_at', 'updated_at'],
  household_invitations:      ['id', 'inviter_user_id', 'household_person_id', 'invited_email', 'invited_user_id', 'status', 'created_at', 'updated_at'],
  savings_accounts:           ['id', 'user_id', 'name', 'account_type', 'currency', 'holding_type', 'stock_symbol', 'stock_name', 'description', 'household_id', 'created_at', 'updated_at'],
  savings_snapshots:          ['id', 'user_id', 'savings_account_id', 'month', 'year', 'balance', 'stock_quantity', 'stock_price_per_share', 'notes', 'household_id', 'created_at', 'updated_at'],
  merchant_categories:        ['id', 'user_id', 'merchant', 'category_id', 'last_used'],
  exchange_rates:             ['id', 'from_currency', 'to_currency', 'rate', 'updated_at'],
  expense_automation_rules:   ['id', 'user_id', 'rule_type', 'merchant_pattern', 'description_pattern', 'category_id', 'household_person_id', 'split_amount', 'split_method', 'category_group_id', 'is_active', 'created_at', 'updated_at'],
  user_category_mappings:     ['id', 'user_id', 'user_category_id', 'household_category_id', 'household_id', 'created_at'],
};

// Tables in the order we migrate them. Profiles first (so we can remap
// user-ids), then anything that references users, then leaf tables. This
// happens to match a topological sort of FK dependencies, though the Sheet
// has no FKs enforced.
const MIGRATION_ORDER: SheetName[] = [
  'profiles',
  'households',
  'household_category_groups',
  'household_categories',
  'household_persons',
  'household_invitations',
  'categories',
  'merchant_categories',
  'expenses',
  'debt_entries',
  'income',
  'savings_accounts',
  'savings_snapshots',
  'exchange_rates',
  'expense_automation_rules',
  'user_category_mappings',
];

// Columns whose values we remap from Supabase auth UUID -> Google sub.
const USER_ID_COLUMNS: Partial<Record<SheetName, string[]>> = {
  profiles:                   ['id'],
  categories:                 ['user_id'],
  expenses:                   ['user_id'],
  income:                     ['user_id'],
  households:                 ['created_by'],
  household_persons:          ['user_id', 'connected_user_id'],
  debt_entries:               ['user_id'],
  household_invitations:      ['inviter_user_id', 'invited_user_id'],
  savings_accounts:           ['user_id'],
  savings_snapshots:          ['user_id'],
  merchant_categories:        ['user_id'],
  expense_automation_rules:   ['user_id'],
  user_category_mappings:     ['user_id'],
};

// ─── Sheets REST helpers ─────────────────────────────────────────────────

const SHEETS_BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

async function sheetsRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${SHEETS_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GOOGLE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API ${res.status} on ${path}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

async function readExistingIds(sheetName: string): Promise<Set<string>> {
  const data = await sheetsRequest(
    `/values/${encodeURIComponent(`${sheetName}!A2:A`)}`,
  ) as { values?: string[][] };
  return new Set((data.values ?? []).map(r => r[0]).filter(Boolean));
}

async function appendBatch(sheetName: string, rows: string[][]): Promise<void> {
  if (rows.length === 0) return;
  await sheetsRequest(
    `/values/${encodeURIComponent(`${sheetName}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) },
  );
}

// ─── Value coercion ──────────────────────────────────────────────────────

function toCell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Migration mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Source : ${SUPABASE_URL}`);
  console.log(`Target : https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}\n`);

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  // ── Build user-id remap from email match ──────────────────────────────

  const sheetProfilesData = await sheetsRequest(
    `/values/${encodeURIComponent('profiles!A2:E')}`,
  ) as { values?: string[][] };
  const sheetProfileRows = sheetProfilesData.values ?? [];

  const sheetEmailToSub = new Map<string, string>();
  for (const row of sheetProfileRows) {
    const [sub, email] = row;
    if (sub && email) sheetEmailToSub.set(email.toLowerCase(), sub);
  }
  console.log(`Sheet has ${sheetEmailToSub.size} existing profile(s).`);

  const { data: supaProfiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, email');
  if (profErr) throw profErr;

  const idRemap = new Map<string, string>();
  for (const p of supaProfiles ?? []) {
    const matchedSub = p.email && sheetEmailToSub.get(String(p.email).toLowerCase());
    if (matchedSub) {
      idRemap.set(p.id, matchedSub);
      console.log(`  remap ${p.email}: ${p.id} -> ${matchedSub}`);
    }
  }
  console.log(`Built ${idRemap.size} user-id remap entries.\n`);

  // ── Migrate each table ────────────────────────────────────────────────

  const totals: Record<string, { read: number; inserted: number; skipped: number }> = {};

  for (const table of MIGRATION_ORDER) {
    const supaCols = SUPABASE_COLUMNS[table];
    const sheetCols = SHEET_SCHEMAS[table];
    const userCols = USER_ID_COLUMNS[table] ?? [];

    process.stdout.write(`[${table}] reading… `);
    // Supabase's PostgREST caps a single `.select()` at 1000 rows by default
    // and silently returns the truncated set. Paginate explicitly via
    // .range() and stop when a page comes back short. Sort by `id` so pages
    // are deterministic across calls.
    const PAGE = 1000;
    const supaRows: Array<Record<string, unknown>> = [];
    let pageErr: { message: string } | null = null;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select(supaCols.join(','))
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) { pageErr = error; break; }
      const batch = (data ?? []) as unknown as Array<Record<string, unknown>>;
      supaRows.push(...batch);
      if (batch.length < PAGE) break;
    }
    if (pageErr) {
      console.log(`SKIP (${pageErr.message})`);
      totals[table] = { read: 0, inserted: 0, skipped: 0 };
      continue;
    }
    process.stdout.write(`${supaRows.length} rows… `);

    const existingIds = await readExistingIds(table);

    // Build sheet-ordered rows, applying user-id remap.
    const remap = (col: string, val: unknown): unknown => {
      if (!userCols.includes(col)) return val;
      if (val == null || val === '') return val;
      return idRemap.get(String(val)) ?? val;
    };
    const rowsToInsert: string[][] = [];
    let skipped = 0;
    for (const r of supaRows) {
      const rawId = String(r['id'] ?? '');
      if (!rawId) { skipped++; continue; }
      // For tables where 'id' itself is a user-id (profiles), the dedup
      // check has to look at the remapped value — otherwise we'd duplicate
      // ligia's profile row, which already exists under her Google sub
      // because OAuth signup created it.
      const effectiveId = String(remap('id', rawId));
      if (existingIds.has(effectiveId)) { skipped++; continue; }
      const cells = sheetCols.map(c => toCell(remap(c, r[c])));
      rowsToInsert.push(cells);
    }

    process.stdout.write(`${rowsToInsert.length} new, ${skipped} skipped`);

    if (!DRY_RUN && rowsToInsert.length > 0) {
      // Batch up to 500 rows per request (Sheets accepts much more, but
      // smaller batches mean less work to retry on transient failures).
      const BATCH = 500;
      for (let i = 0; i < rowsToInsert.length; i += BATCH) {
        await appendBatch(table, rowsToInsert.slice(i, i + BATCH));
      }
      process.stdout.write(' — written');
    }
    process.stdout.write('\n');

    totals[table] = { read: supaRows.length, inserted: rowsToInsert.length, skipped };
  }

  // ── Summary ───────────────────────────────────────────────────────────

  console.log('\n─── Summary ─────────────────────────────────────────');
  console.log(`${'table'.padEnd(28)} ${'read'.padStart(6)} ${'inserted'.padStart(10)} ${'skipped'.padStart(8)}`);
  for (const [t, s] of Object.entries(totals)) {
    console.log(`${t.padEnd(28)} ${String(s.read).padStart(6)} ${String(s.inserted).padStart(10)} ${String(s.skipped).padStart(8)}`);
  }
  if (DRY_RUN) {
    console.log('\nDRY RUN — nothing was written. Re-run without --dry-run to apply.');
  } else {
    console.log('\nDone.');
  }
}

main().catch(e => {
  console.error('\nMigration failed:', e);
  process.exit(1);
});
