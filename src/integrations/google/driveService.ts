// Google Drive API helpers — spreadsheet creation and sharing.

export class DriveService {
  private sheetsBase = 'https://sheets.googleapis.com/v4/spreadsheets';
  private driveBase = 'https://www.googleapis.com/drive/v3/files';

  // App-private metadata key. Stored in Drive's `appProperties` so it's
  // visible only to this OAuth client. Used to find the user's household
  // sheet across devices without needing local storage.
  static readonly APP_PROP_KEY = 'shared_budget_sheets';
  static readonly APP_PROP_VALUE = '1';

  constructor(private accessToken: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // Creates a new Google Spreadsheet and returns its ID. Best-effort tags
  // the new file so subsequent sign-ins can locate it via Drive search
  // alone (no local storage required).
  async createSpreadsheet(title: string): Promise<string> {
    const res = await fetch(this.sheetsBase, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ properties: { title } }),
    });
    if (!res.ok) throw new Error(`Failed to create spreadsheet: ${await res.text()}`);
    const data = await res.json() as { spreadsheetId: string };
    await this.tagSpreadsheet(data.spreadsheetId).catch(e =>
      console.warn('[Drive] failed to tag new spreadsheet:', e),
    );
    return data.spreadsheetId;
  }

  // Sets the app-private appProperty marker on a spreadsheet. Idempotent —
  // calling on an already-tagged file is a no-op write.
  async tagSpreadsheet(id: string): Promise<void> {
    const res = await fetch(`${this.driveBase}/${id}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({
        appProperties: { [DriveService.APP_PROP_KEY]: DriveService.APP_PROP_VALUE },
      }),
    });
    if (!res.ok) throw new Error(`Failed to tag spreadsheet: ${await res.text()}`);
  }

  // Finds a spreadsheet previously tagged via tagSpreadsheet. With our
  // drive.file OAuth scope, Drive's file list only includes files the app
  // has created or that the user has explicitly linked, so we won't
  // collide with random spreadsheets in the user's Drive. If multiple are
  // tagged (the user linked more than one), returns the most recently
  // modified match.
  async findTaggedSpreadsheet(): Promise<string | null> {
    const q = encodeURIComponent(
      `appProperties has { key='${DriveService.APP_PROP_KEY}' and value='${DriveService.APP_PROP_VALUE}' } ` +
      `and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    );
    const res = await fetch(
      `${this.driveBase}?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=10`,
      { headers: this.headers() },
    );
    if (!res.ok) return null;
    const data = await res.json() as { files?: Array<{ id: string }> };
    return data.files?.[0]?.id ?? null;
  }

  // Searches the user's Drive for a spreadsheet with an exact title match.
  // Returns the spreadsheet ID, or null if not found. Kept as a backward-
  // compatibility fallback for users whose existing sheet doesn't yet have
  // the appProperty tag — once found this way, AuthContext re-tags it.
  async findSpreadsheetByTitle(title: string): Promise<string | null> {
    const q = encodeURIComponent(
      `name='${title.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    );
    const res = await fetch(`${this.driveBase}?q=${q}&fields=files(id,name)`, {
      headers: this.headers(),
    });
    if (!res.ok) return null;
    const data = await res.json() as { files?: Array<{ id: string }> };
    return data.files?.[0]?.id ?? null;
  }

  // Shares the spreadsheet with another Google account as an editor.
  async shareSpreadsheet(spreadsheetId: string, email: string): Promise<void> {
    const res = await fetch(
      `${this.driveBase}/${spreadsheetId}/permissions`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }),
      },
    );
    if (!res.ok) throw new Error(`Failed to share spreadsheet: ${await res.text()}`);
  }
}
