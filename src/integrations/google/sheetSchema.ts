// Column headers for every sheet tab in the spreadsheet.
// Column A is always "id". Order here determines column order in the sheet.
export const SHEET_SCHEMAS: Record<string, string[]> = {
  profiles: ['id', 'email', 'full_name', 'created_at', 'updated_at'],
  categories: ['id', 'name', 'color', 'is_default', 'user_id', 'created_at'],
  expenses: [
    'id', 'date', 'merchant', 'amount', 'currency', 'category_id',
    'user_id', 'description', 'household_id', 'created_at', 'updated_at',
  ],
  income: [
    'id', 'date', 'source', 'amount', 'currency', 'user_id',
    'description', 'household_id', 'created_at', 'updated_at',
  ],
  households: ['id', 'name', 'created_by', 'created_at', 'updated_at'],
  household_persons: [
    'id', 'user_id', 'household_id', 'name', 'email',
    'connected_user_id', 'include_in_household_view', 'created_at', 'updated_at',
  ],
  household_categories: [
    'id', 'household_id', 'name', 'color', 'is_default', 'group_id', 'created_at', 'updated_at',
  ],
  household_category_groups: [
    'id', 'household_id', 'name', 'color', 'icon', 'display_order', 'created_at', 'updated_at',
  ],
  debt_entries: [
    'id', 'user_id', 'household_person_id', 'amount', 'currency',
    'description', 'date', 'type', 'expense_id', 'split_method',
    'split_value', 'resolved', 'created_at', 'updated_at',
  ],
  household_invitations: [
    'id', 'inviter_user_id', 'household_person_id', 'invited_email',
    'invited_user_id', 'status', 'created_at', 'updated_at',
  ],
  savings_accounts: [
    'id', 'user_id', 'name', 'account_type', 'currency', 'holding_type',
    'stock_symbol', 'stock_name', 'description', 'household_id', 'created_at', 'updated_at',
  ],
  savings_snapshots: [
    'id', 'user_id', 'savings_account_id', 'month', 'year', 'balance',
    'stock_quantity', 'stock_price_per_share', 'notes', 'household_id', 'created_at', 'updated_at',
  ],
  merchant_categories: ['id', 'merchant', 'category_id', 'user_id', 'last_used'],
  exchange_rates: ['id', 'from_currency', 'to_currency', 'rate', 'updated_at'],
  expense_automation_rules: [
    'id', 'user_id', 'rule_type', 'merchant_pattern', 'description_pattern',
    'category_id', 'category_group_id', 'household_person_id', 'split_amount',
    'split_method', 'is_active', 'created_at', 'updated_at',
  ],
  user_category_mappings: [
    'id', 'user_id', 'user_category_id', 'household_category_id', 'household_id', 'created_at',
  ],
};

export type SheetName = keyof typeof SHEET_SCHEMAS;

// Returns the 0-based column index for a given column name in a sheet.
export function colIndex(sheetName: SheetName, columnName: string): number {
  const idx = SHEET_SCHEMAS[sheetName].indexOf(columnName);
  if (idx === -1) throw new Error(`Column "${columnName}" not found in sheet "${sheetName}"`);
  return idx;
}

// Converts a 0-based column index to A1 letter notation (0→A, 25→Z, 26→AA …)
export function columnLetter(index: number): string {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}
