
export interface HouseholdPerson {
  id: string;
  user_id: string;
  household_id?: string;
  name: string;
  email?: string;
  connected_user_id?: string;
  include_in_household_view?: boolean;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export interface HouseholdInvitation {
  id: string;
  inviter_user_id: string;
  household_person_id: string;
  invited_email: string;
  invited_user_id?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  household_person?: Pick<HouseholdPerson, 'id' | 'name'> | null;
  inviter?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export interface DebtEntry {
  id: string;
  user_id: string;
  household_person_id: string;
  amount: number;
  currency: string;
  description?: string;
  date: string;
  type: 'owe_me' | 'i_owe';
  expense_id?: string;
  // New fields to support dynamic splits
  split_method?: 'amount' | 'percentage';
  split_value?: number;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  household_person?: Pick<HouseholdPerson, 'id' | 'name' | 'email' | 'user_id'> & { household_id?: string };
  creator?: {
    id: string;
    full_name?: string;
    email: string;
  };
  otherPersonHouseholdId?: string;
}
