import type { GoogleSheetsService } from './sheetsService';
import { nowIso } from './sheetsService';

// Reconcile the signed-in user with whatever already exists in the sheet
// for their email address.
//
// Three things happen, in order:
//
// 1. **Profile claim**. If a `profiles` row exists with the user's email
//    but a different id (typically a Supabase UUID left over from the
//    migration, or another previous incarnation), every reference to that
//    old id across the entire spreadsheet is rewritten to the user's
//    Google sub via a single server-side find/replace. The profile row's
//    own id is rewritten in the same pass.
//
// 2. **Profile create**. If no row exists for this email and id, a new
//    profiles row is appended.
//
// 3. **Auto-accept invitations**. Any pending `household_invitations`
//    addressed to this email are flipped to `accepted` and the matching
//    `household_persons.connected_user_id` is set to the user's id, so
//    the user doesn't have to find and click "accept" in the UI.
//
// All of this is best-effort and idempotent — running it on every sign-in
// is fine.

interface ReconcileArgs {
  svc: GoogleSheetsService;
  userId: string;       // Google sub
  email: string;
  fullName: string;
}

export async function reconcileUser({ svc, userId, email, fullName }: ReconcileArgs): Promise<void> {
  const lowerEmail = email.toLowerCase();

  // ── 1 & 2: profile claim or create ─────────────────────────────────────

  // We look up by id first (cheap path: already-claimed user), then by
  // email (rare path: legacy migrated user signing in for the first time
  // under a Google account). Both queries hit the same sheet; we read the
  // full profiles tab once and process locally.
  const allProfiles = await svc.getAll('profiles', r => ({
    id: r[0],
    email: r[1] ?? '',
    full_name: r[2] ?? '',
  }));

  const byId = allProfiles.find(p => p.id === userId);
  if (byId) {
    // Already linked. Nothing to do.
  } else {
    const byEmail = allProfiles.find(p => p.email && p.email.toLowerCase() === lowerEmail);
    if (byEmail) {
      // Found a profile row with our email but a different id — claim it
      // by rewriting every reference to that old id across the whole
      // spreadsheet. After this, the profile row's id is also our id.
      await svc.findReplaceAcrossSpreadsheet(byEmail.id, userId);
    } else {
      const now = nowIso();
      await svc.appendRow('profiles', [userId, email, fullName, now, now]);
    }
  }

  // ── 3: auto-accept pending invitations addressed to this email ────────

  // Note: by the time we get here, profile-claim has already remapped
  // any old user-ids, so household_persons rows that previously pointed
  // at a Supabase UUID for this user now point at `userId`.

  // a) flip pending invitations to 'accepted'
  const invitations = await svc.getAll('household_invitations', r => ({
    id: r[0],
    invited_email: r[3] ?? '',
    status: r[5] ?? '',
  }));
  for (const inv of invitations) {
    if (inv.invited_email.toLowerCase() === lowerEmail && inv.status === 'pending') {
      try {
        await svc.updateById('household_invitations', inv.id, {
          status: 'accepted',
          invited_user_id: userId,
        });
      } catch (e) {
        console.warn('[reconcile] failed to auto-accept invitation:', e);
      }
    }
  }

  // b) ensure household_persons.connected_user_id is set on any row
  //    addressed to this email but not yet connected
  const persons = await svc.getAll('household_persons', r => ({
    id: r[0],
    email: r[4] ?? '',
    connected_user_id: r[5] ?? '',
  }));
  for (const p of persons) {
    if (
      p.email
      && p.email.toLowerCase() === lowerEmail
      && p.connected_user_id !== userId
    ) {
      try {
        await svc.updateById('household_persons', p.id, { connected_user_id: userId });
      } catch (e) {
        console.warn('[reconcile] failed to link household person:', e);
      }
    }
  }
}
