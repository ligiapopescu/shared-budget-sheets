export interface ExpenseSplit {
  household_person_id: string;
  household_person_name: string;
  split_method: 'amount' | 'percentage';
  split_value: number;
  debt_entry_id?: string;
}

export interface Expense {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  user_id: string;
  currency: string;
  description?: string;
  splits?: ExpenseSplit[];
}

export interface ExpenseAutomationRule {
  id: string;
  user_id: string;
  rule_type: 'delete' | 'split';
  merchant_pattern?: string;
  description_pattern?: string;
  category_id?: string;
  category_group_id?: string;
  household_person_id?: string;
  split_amount?: number;
  split_method?: 'amount' | 'percentage';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
