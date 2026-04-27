/**
 * GOOGLE CLOUD SETUP (one-time, before first run)
 * ─────────────────────────────────────────────────────────────────────
 * 1. Go to https://console.cloud.google.com/ and create a project.
 * 2. Enable APIs:
 *      APIs & Services → Library → search "Google Sheets API" → Enable
 *      APIs & Services → Library → search "Google Drive API" → Enable
 * 3. Create OAuth 2.0 credentials:
 *      APIs & Services → Credentials → Create Credentials → OAuth Client ID
 *      Application type: Web application
 *      Authorised JavaScript origins: http://localhost:8080  (add prod domain later)
 *      Authorised redirect URIs: http://localhost:8080
 * 4. Copy the Client ID into .env as:
 *      VITE_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
 * 5. In APIs & Services → OAuth consent screen:
 *      Add scopes: spreadsheets, drive.file, openid, email, profile
 *      Add your own email as a test user while the app is in "Testing" mode.
 * ─────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { GoogleSheetsService, DriveService } from '@/integrations/google/client';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UserMetadata {
  full_name?: string;
  preferred_currency?: string;
  preferred_number_format?: string;
  preferred_date_format?: string;
}

// Shape mirrors what Supabase's User type exposed so all existing hooks
// and components continue working without changes.
export interface GoogleUser {
  id: string;               // Google sub — used as user_id everywhere
  email: string;
  name: string;
  picture: string;
  user_metadata: UserMetadata;
}

interface AuthContextType {
  user: GoogleUser | null;
  session: null;            // always null; kept for API compatibility
  spreadsheetId: string | null;
  sheetsService: GoogleSheetsService | null;
  loading: boolean;
  initiateLogin: () => void;
  signOut: () => Promise<void>;
  updateUserMetadata: (key: keyof UserMetadata, value: string) => void;
  refreshToken: () => void;
  createNewSpreadsheet: () => Promise<void>;
  connectToSpreadsheet: (spreadsheetId: string) => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

// ─── localStorage helpers ────────────────────────────────────────────────────

const spreadsheetTitle = (email: string) => `Shared Budget Sheets — ${email}`;

function metaKey(userId: string) { return `user_meta_${userId}`; }
function sheetKey(userId: string) { return `spreadsheet_id_${userId}`; }

function loadMeta(userId: string): UserMetadata {
  try { return JSON.parse(localStorage.getItem(metaKey(userId)) ?? '{}'); }
  catch { return {}; }
}

function saveMeta(userId: string, meta: UserMetadata) {
  localStorage.setItem(metaKey(userId), JSON.stringify(meta));
}

interface CachedProfile { id: string; email: string; name: string; picture: string; }

function loadCachedProfile(): CachedProfile | null {
  try {
    const raw = localStorage.getItem('cached_google_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCachedProfile(u: GoogleUser) {
  localStorage.setItem('cached_google_user', JSON.stringify({
    id: u.id, email: u.email, name: u.name, picture: u.picture,
  }));
}

// ─── Provider ───────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [sheetsService, setSheetsService] = useState<GoogleSheetsService | null>(null);
  const [loading, setLoading] = useState(true);
  const serviceRef = useRef<GoogleSheetsService | null>(null);
  const latestTokenRef = useRef<string | null>(null);

  // ── Token → full auth init ───────────────────────────────────────────

  async function onTokenSuccess(accessToken: string) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch Google userinfo');
      const info = await res.json() as { sub: string; email: string; name: string; picture: string };
      const { sub, email, name, picture } = info;

      const meta = loadMeta(sub);
      const googleUser: GoogleUser = { id: sub, email, name, picture, user_metadata: meta };
      setUser(googleUser);
      saveCachedProfile(googleUser);
      // Keep the access token in the ref so createNewSpreadsheet / connectToSpreadsheet can use it.
      latestTokenRef.current = accessToken;

      // If a spreadsheet was previously linked, reconnect silently.
      const sid = localStorage.getItem(sheetKey(sub));
      if (sid) {
        const svc = new GoogleSheetsService(sid, accessToken);
        await svc.initializeSpreadsheet();
        const existing = await svc.getWhere('profiles', 'id', sub, r => r);
        if (existing.length === 0) {
          const now = new Date().toISOString();
          await svc.appendRow('profiles', [sub, email, name, now, now]);
        }
        setSpreadsheetId(sid);
        setSheetsService(svc);
        serviceRef.current = svc;
      }
      // Otherwise spreadsheetId and sheetsService stay null — the SpreadsheetSetup UI will handle it.
    } catch (err) {
      console.error('[Auth] init error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function initSpreadsheet(sid: string) {
    const accessToken = latestTokenRef.current;
    if (!accessToken || !user) throw new Error('Not authenticated');
    const svc = new GoogleSheetsService(sid, accessToken);
    await svc.initializeSpreadsheet();
    const existing = await svc.getWhere('profiles', 'id', user.id, r => r);
    if (existing.length === 0) {
      const now = new Date().toISOString();
      await svc.appendRow('profiles', [user.id, user.email, user.name, now, now]);
    }
    localStorage.setItem(sheetKey(user.id), sid);
    setSpreadsheetId(sid);
    setSheetsService(svc);
    serviceRef.current = svc;
  }

  // ── Google login hooks (top-level calls required by React) ───────────

  const triggerLogin = useGoogleLogin({
    onSuccess: r => onTokenSuccess(r.access_token),
    onError: () => setLoading(false),
    scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    flow: 'implicit',
  });

  const triggerSilentLogin = useGoogleLogin({
    onSuccess: r => onTokenSuccess(r.access_token),
    onError: () => setLoading(false),
    scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    flow: 'implicit',
    prompt: '',   // empty string = no prompt if session is still active
  });

  // ── On mount ─────────────────────────────────────────────────────────

  useEffect(() => {
    const cached = loadCachedProfile();
    if (cached) {
      // Show cached identity instantly; then try a silent token refresh.
      const meta = loadMeta(cached.id);
      setUser({ ...cached, user_metadata: meta });
      const sid = localStorage.getItem(sheetKey(cached.id));
      if (sid) setSpreadsheetId(sid);
      // Silent re-auth: works if the Google session cookie is still valid.
      // If it fails (onError), loading becomes false and the login button appears.
      triggerSilentLogin();
    } else {
      setLoading(false);
    }
  // triggerSilentLogin is stable across renders (react-oauth/google guarantee)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ────────────────────────────────────────────────────────

  const initiateLogin = () => {
    setLoading(true);
    triggerLogin();
  };

  const signOut = async () => {
    setUser(null);
    setSheetsService(null);
    serviceRef.current = null;
    setSpreadsheetId(null);
    latestTokenRef.current = null;
    localStorage.removeItem('cached_google_user');
  };

  const createNewSpreadsheet = async () => {
    if (!user) throw new Error('Not authenticated');
    const accessToken = latestTokenRef.current;
    if (!accessToken) throw new Error('No access token — please sign in again');
    const drive = new DriveService(accessToken);
    const title = spreadsheetTitle(user.email);
    let sid = await drive.findSpreadsheetByTitle(title);
    if (!sid) sid = await drive.createSpreadsheet(title);
    await initSpreadsheet(sid);
  };

  const connectToSpreadsheet = async (id: string) => {
    // Accept either a full URL or a bare spreadsheet ID.
    const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const sid = match ? match[1] : id.trim();
    if (!sid) throw new Error('Invalid spreadsheet ID or URL');
    await initSpreadsheet(sid);
  };

  const updateUserMetadata = (key: keyof UserMetadata, value: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, user_metadata: { ...prev.user_metadata, [key]: value } };
      saveMeta(prev.id, updated.user_metadata);
      return updated;
    });
  };

  const refreshToken = () => { triggerSilentLogin(); };

  return (
    <AuthContext.Provider value={{
      user,
      session: null,
      spreadsheetId,
      sheetsService,
      loading,
      initiateLogin,
      signOut,
      updateUserMetadata,
      refreshToken,
      createNewSpreadsheet,
      connectToSpreadsheet,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
