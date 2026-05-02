// In-memory replacement for GoogleSheetsService used by demo mode (?demo=1).
// Implements the same public API but reads/writes a Map<sheetName, string[][]>
// instead of hitting the Sheets REST API. No network, no auth.
//
// All hooks call into `sheetsService` via the public methods overridden here
// (getRange, batchGet, appendRow, updateRow, deleteRow, batchUpdate). The
// higher-level helpers in the parent class (getAll, getWhere, insert, update,
// upsert, delete) work as-is because they delegate to those primitives.

import { GoogleSheetsService } from './sheetsService';

export class MockSheetsService extends GoogleSheetsService {
  private store: Map<string, string[][]>;

  constructor(initialData: Record<string, string[][]>) {
    super('demo-spreadsheet-id', 'demo-token');
    this.store = new Map(Object.entries(initialData));
  }

  async getRange(sheetName: string, _range?: string): Promise<string[][]> {
    return this.store.get(sheetName) ?? [];
  }

  async batchGet(sheetNames: string[]): Promise<Record<string, string[][]>> {
    const result: Record<string, string[][]> = {};
    sheetNames.forEach(n => { result[n] = this.store.get(n) ?? []; });
    return result;
  }

  async appendRow(sheetName: string, values: string[]): Promise<void> {
    if (!this.store.has(sheetName)) this.store.set(sheetName, []);
    this.store.get(sheetName)!.push(values);
  }

  async updateRow(sheetName: string, rowNum: number, values: string[]): Promise<void> {
    const rows = this.store.get(sheetName);
    if (!rows) return;
    rows[rowNum - 2] = values;
  }

  async deleteRow(sheetName: string, id: string): Promise<void> {
    const rows = this.store.get(sheetName);
    if (!rows) return;
    const idx = rows.findIndex(r => r[0] === id);
    if (idx !== -1) rows.splice(idx, 1);
  }

  async batchUpdate(_requests: object[]): Promise<void> {
    // Sheet-metadata mutations (addSheet, addTable, deleteDimension) are no-ops
    // in the mock — the data already exists in memory.
  }

  async getSheetId(_sheetName: string): Promise<number> {
    return 0;
  }

  async initializeSpreadsheet(): Promise<void> {
    // Fixtures already populated; nothing to do.
  }

  async findReplaceAcrossSpreadsheet(find: string, replacement: string): Promise<void> {
    if (!find || find === replacement) return;
    for (const rows of this.store.values()) {
      for (const row of rows) {
        for (let i = 0; i < row.length; i++) {
          if (row[i] === find) row[i] = replacement;
        }
      }
    }
  }
}
