// Google Drive API helpers — spreadsheet creation and sharing.

export class DriveService {
  private sheetsBase = 'https://sheets.googleapis.com/v4/spreadsheets';
  private driveBase = 'https://www.googleapis.com/drive/v3/files';

  constructor(private accessToken: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // Creates a new Google Spreadsheet and returns its ID.
  async createSpreadsheet(title: string): Promise<string> {
    const res = await fetch(this.sheetsBase, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ properties: { title } }),
    });
    if (!res.ok) throw new Error(`Failed to create spreadsheet: ${await res.text()}`);
    const data = await res.json() as { spreadsheetId: string };
    return data.spreadsheetId;
  }

  // Searches the user's Drive for a spreadsheet with an exact title match.
  // Returns the spreadsheet ID, or null if not found.
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
