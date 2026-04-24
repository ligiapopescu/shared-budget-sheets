import { v4 as uuidv4 } from 'uuid';
import { SHEET_SCHEMAS, SheetName, colIndex, columnLetter } from './sheetSchema';

// ─── ID / timestamp helpers ────────────────────────────────────────────────

export function newId(): string {
  return typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : uuidv4();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ─── Row-index cache ───────────────────────────────────────────────────────

interface CacheEntry {
  ids: string[];      // index 0 = first data row (row 2 in the sheet)
  expiresAt: number;
}

// ─── Main service ──────────────────────────────────────────────────────────

export class GoogleSheetsService {
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private cache: Map<string, CacheEntry> = new Map();
  // Numeric tab IDs (sheetId) fetched once on first use, keyed by sheet name.
  private sheetIds: Map<string, number> = new Map();

  constructor(
    private spreadsheetId: string,
    private accessToken: string,
  ) {}

  // Update the access token when it is refreshed.
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  // ── HTTP primitives ────────────────────────────────────────────────────

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}/${this.spreadsheetId}${path}`;
    let delay = 1000;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(url, {
        ...init,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
      if (res.ok) return res.json();
      if (res.status === 429 && attempt < 3) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      const body = await res.text();
      throw new Error(`Sheets API ${res.status}: ${body}`);
    }
  }

  // ── Range reads ────────────────────────────────────────────────────────

  // Read all rows for a sheet (excluding header row 1). Returns string[][].
  async getRange(sheetName: string, range?: string): Promise<string[][]> {
    const r = range ?? `${sheetName}!A2:ZZ`;
    const data = await this.request(`/values/${encodeURIComponent(r)}`) as { values?: string[][] };
    return data.values ?? [];
  }

  // Read multiple sheets in one HTTP call. Returns map of sheetName → rows.
  async batchGet(sheetNames: string[]): Promise<Record<string, string[][]>> {
    if (sheetNames.length === 0) return {};
    const params = sheetNames
      .map(n => `ranges=${encodeURIComponent(`${n}!A2:ZZ`)}`)
      .join('&');
    const data = await this.request(`/values:batchGet?${params}`) as {
      valueRanges?: Array<{ range: string; values?: string[][] }>;
    };
    const result: Record<string, string[][]> = {};
    (data.valueRanges ?? []).forEach((vr, i) => {
      result[sheetNames[i]] = vr.values ?? [];
    });
    return result;
  }

  // ── Row-index cache helpers ────────────────────────────────────────────

  private invalidateCache(sheetName: string) {
    this.cache.delete(sheetName);
  }

  // Returns 0-based index into the data-rows array for a given id.
  // The actual sheet row is dataIndex + 2 (row 1 = header, row 2 = first data row).
  async findRowByIdIndex(sheetName: string, id: string): Promise<number> {
    const now = Date.now();
    let entry = this.cache.get(sheetName);
    if (!entry || entry.expiresAt < now) {
      const rows = await this.getRange(sheetName, `${sheetName}!A2:A`);
      entry = { ids: rows.map(r => r[0] ?? ''), expiresAt: now + 30_000 };
      this.cache.set(sheetName, entry);
    }
    const idx = entry.ids.indexOf(id);
    if (idx === -1) throw new Error(`Row with id "${id}" not found in sheet "${sheetName}"`);
    return idx;
  }

  // Returns the 1-based sheet row number for an id (row 1 = header).
  private async rowNumber(sheetName: string, id: string): Promise<number> {
    return (await this.findRowByIdIndex(sheetName, id)) + 2;
  }

  // ── Sheet metadata ─────────────────────────────────────────────────────

  // Returns the numeric sheetId (tab id) for a named sheet tab.
  async getSheetId(sheetName: string): Promise<number> {
    if (this.sheetIds.has(sheetName)) return this.sheetIds.get(sheetName)!;
    const data = await this.request('') as {
      sheets?: Array<{ properties: { title: string; sheetId: number } }>;
    };
    (data.sheets ?? []).forEach(s => {
      this.sheetIds.set(s.properties.title, s.properties.sheetId);
    });
    if (!this.sheetIds.has(sheetName)) throw new Error(`Sheet "${sheetName}" not found`);
    return this.sheetIds.get(sheetName)!;
  }

  // ── Writes ─────────────────────────────────────────────────────────────

  async appendRow(sheetName: string, values: string[]): Promise<void> {
    this.invalidateCache(sheetName);
    await this.request(
      `/values/${encodeURIComponent(`${sheetName}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values: [values] }) },
    );
  }

  async updateRow(sheetName: string, rowNum: number, values: string[]): Promise<void> {
    this.invalidateCache(sheetName);
    const lastCol = columnLetter(values.length - 1);
    const range = `${sheetName}!A${rowNum}:${lastCol}${rowNum}`;
    await this.request(
      `/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ values: [values] }) },
    );
  }

  async deleteRow(sheetName: string, id: string): Promise<void> {
    const dataIdx = await this.findRowByIdIndex(sheetName, id);
    const sheetId = await this.getSheetId(sheetName);
    const startIndex = dataIdx + 1; // +1 for header row
    this.invalidateCache(sheetName);
    await this.request('/batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex: startIndex + 1,
            },
          },
        }],
      }),
    });
  }

  async batchUpdate(requests: object[]): Promise<void> {
    await this.request('/batchUpdate', {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  // ── Generic CRUD ────────────────────────────────────────────────────────

  async getAll<T>(sheetName: SheetName, deserialize: (row: string[]) => T): Promise<T[]> {
    const rows = await this.getRange(sheetName);
    return rows.filter(r => r.length > 0 && r[0]).map(deserialize);
  }

  async getWhere<T>(
    sheetName: SheetName,
    columnName: string,
    value: string,
    deserialize: (row: string[]) => T,
  ): Promise<T[]> {
    const idx = colIndex(sheetName, columnName);
    const rows = await this.getRange(sheetName);
    return rows.filter(r => r[idx] === value).map(deserialize);
  }

  async getWhereMultiple<T>(
    sheetName: SheetName,
    filter: (row: string[]) => boolean,
    deserialize: (row: string[]) => T,
  ): Promise<T[]> {
    const rows = await this.getRange(sheetName);
    return rows.filter(r => r.length > 0 && r[0] && filter(r)).map(deserialize);
  }

  // Inserts a new row; automatically adds id, created_at, updated_at if the
  // caller passes them as empty strings ('').
  async insert<T extends Record<string, unknown>>(
    sheetName: SheetName,
    record: T,
    serialize: (record: T) => string[],
  ): Promise<T> {
    const id = (record.id as string) || newId();
    const now = nowIso();
    const full = {
      ...record,
      id,
      created_at: record.created_at || now,
      updated_at: record.updated_at || now,
    } as T;
    await this.appendRow(sheetName, serialize(full));
    return full;
  }

  async update<T extends Record<string, unknown>>(
    sheetName: SheetName,
    id: string,
    updates: Partial<T>,
    currentRow: string[],
    serialize: (record: T) => string[],
  ): Promise<void> {
    const headers = SHEET_SCHEMAS[sheetName];
    const merged: Record<string, string> = {};
    headers.forEach((h, i) => { merged[h] = currentRow[i] ?? ''; });
    Object.entries(updates).forEach(([k, v]) => {
      merged[k] = v == null ? '' : String(v);
    });
    merged['updated_at'] = nowIso();
    const values = headers.map(h => merged[h] ?? '');
    const rowNum = await this.rowNumber(sheetName, id);
    await this.updateRow(sheetName, rowNum, values);
  }

  // Simplified update that works directly from a plain object (no serialize needed).
  async updateById(sheetName: SheetName, id: string, updates: Record<string, string>): Promise<void> {
    const currentRows = await this.getRange(sheetName, `${sheetName}!A2:ZZ`);
    const headers = SHEET_SCHEMAS[sheetName];
    const idIdx = 0;
    const currentRow = currentRows.find(r => r[idIdx] === id);
    if (!currentRow) throw new Error(`Row "${id}" not found in "${sheetName}"`);
    const merged: Record<string, string> = {};
    headers.forEach((h, i) => { merged[h] = currentRow[i] ?? ''; });
    Object.entries(updates).forEach(([k, v]) => { merged[k] = v; });
    merged['updated_at'] = nowIso();
    const values = headers.map(h => merged[h] ?? '');
    const rowNum = await this.rowNumber(sheetName, id);
    await this.updateRow(sheetName, rowNum, values);
  }

  async delete(sheetName: SheetName, id: string): Promise<void> {
    await this.deleteRow(sheetName, id);
  }

  // Upsert: finds a row matching all matchColumns values, updates it; otherwise inserts.
  async upsert<T extends Record<string, unknown>>(
    sheetName: SheetName,
    matchColumns: string[],          // column names to match on
    record: T,
    serialize: (record: T) => string[],
  ): Promise<T> {
    const rows = await this.getRange(sheetName);
    const headers = SHEET_SCHEMAS[sheetName];
    const matchIdxs = matchColumns.map(c => headers.indexOf(c));
    const existing = rows.find(row =>
      matchIdxs.every(i => row[i] === String((record as Record<string, unknown>)[headers[i]])),
    );
    if (existing) {
      const id = existing[0];
      const now = nowIso();
      const merged: Record<string, string> = {};
      headers.forEach((h, i) => { merged[h] = existing[i] ?? ''; });
      Object.entries(record).forEach(([k, v]) => { merged[k] = v == null ? '' : String(v); });
      merged['updated_at'] = now;
      const rowNum = await this.rowNumber(sheetName, id);
      await this.updateRow(sheetName, rowNum, headers.map(h => merged[h] ?? ''));
      return { ...record, id, updated_at: now } as T;
    }
    return this.insert(sheetName, record, serialize);
  }

  // ── Sheet initialisation ────────────────────────────────────────────────

  // Creates all sheets from SHEET_SCHEMAS that don't already exist,
  // writes header rows, and deletes the default "Sheet1" tab.
  async initializeSpreadsheet(): Promise<void> {
    const data = await this.request('') as {
      sheets?: Array<{ properties: { title: string; sheetId: number } }>;
    };
    const existing = new Set((data.sheets ?? []).map(s => s.properties.title));
    const defaultSheetId = (data.sheets ?? []).find(
      s => s.properties.title === 'Sheet1',
    )?.properties.sheetId;

    const toCreate = Object.keys(SHEET_SCHEMAS).filter(n => !existing.has(n));
    if (toCreate.length === 0 && defaultSheetId == null) return;

    const addRequests = toCreate.map(title => ({
      addSheet: { properties: { title } },
    }));
    const deleteRequest = defaultSheetId != null
      ? [{ deleteSheet: { sheetId: defaultSheetId } }]
      : [];

    if (addRequests.length > 0 || deleteRequest.length > 0) {
      await this.batchUpdate([...addRequests, ...deleteRequest]);
    }

    // Refresh sheetId cache after creation
    const fresh = await this.request('') as {
      sheets?: Array<{ properties: { title: string; sheetId: number } }>;
    };
    (fresh.sheets ?? []).forEach(s => {
      this.sheetIds.set(s.properties.title, s.properties.sheetId);
    });

    // Write header rows for newly created sheets
    for (const name of toCreate) {
      const headers = SHEET_SCHEMAS[name];
      await this.request(
        `/values/${encodeURIComponent(`${name}!A1`)}:append?valueInputOption=RAW`,
        { method: 'POST', body: JSON.stringify({ values: [headers] }) },
      );
    }
  }
}
