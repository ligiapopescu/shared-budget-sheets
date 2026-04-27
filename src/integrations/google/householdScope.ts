import type { GoogleSheetsService } from './sheetsService';

// Helpers for household-membership lookups against the household_persons sheet.
//
// household_persons columns:
//   0:id 1:user_id 2:household_id 3:name 4:email
//   5:connected_user_id 6:include_in_household_view 7:created_at 8:updated_at
//
// "Membership" = either you created the row (user_id) or you accepted an
// invitation that connected your user_id (connected_user_id).

const isMembershipRow = (userId: string) => (r: string[]) =>
  r[1] === userId || r[5] === userId;

// Returns every household_persons row tied to the given user.
export async function loadHouseholdMembershipRows(
  sheetsService: GoogleSheetsService,
  userId: string,
): Promise<string[][]> {
  return sheetsService.getWhereMultiple('household_persons', isMembershipRow(userId), r => r);
}

// Returns the household_id for the user's first membership row, or null if
// they don't belong to one yet.
export async function getHouseholdIdForUser(
  sheetsService: GoogleSheetsService,
  userId: string,
): Promise<string | null> {
  const rows = await loadHouseholdMembershipRows(sheetsService, userId);
  return rows[0]?.[2] ?? null;
}

// Builds the set of user_ids whose records the current user is allowed to see.
// When `includeHousehold` is false, that's just the user themselves; when true,
// it expands to every user_id (and connected_user_id) that shares a household.
export async function getAllowedUserIds(
  sheetsService: GoogleSheetsService,
  userId: string,
  includeHousehold: boolean,
): Promise<Set<string>> {
  const allowed = new Set<string>([userId]);
  if (!includeHousehold) return allowed;
  const rows = await loadHouseholdMembershipRows(sheetsService, userId);
  rows.forEach(r => {
    if (r[1]) allowed.add(r[1]);
    if (r[5]) allowed.add(r[5]);
  });
  return allowed;
}
