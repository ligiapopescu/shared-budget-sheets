export interface SavingsAccount {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  currency: string;
  holding_type: 'currency' | 'stock';
  stock_symbol?: string;
  stock_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsSnapshot {
  id: string;
  user_id: string;
  savings_account_id: string;
  month: number;
  year: number;
  balance: number;
  stock_quantity?: number;
  stock_price_per_share?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}