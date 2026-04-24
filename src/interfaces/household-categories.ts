export interface HouseholdCategory {
  id: string;
  household_id: string;
  name: string;
  color: string;
  is_default: boolean;
  group_id: string | null;
  created_at: string;
  updated_at: string;
}