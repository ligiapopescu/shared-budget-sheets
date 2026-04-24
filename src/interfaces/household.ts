export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserCategoryMapping {
  id: string;
  user_id: string;
  user_category_id: string;
  household_category_id: string;
  household_id: string;
  created_at: string;
}

// Re-export existing interfaces
export * from './debt';
export * from './household-categories';