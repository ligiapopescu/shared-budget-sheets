export interface Income {
  id: string;
  date: string;
  source: string;
  amount: number;
  user_id: string;
  currency: string;
  description?: string;
}
