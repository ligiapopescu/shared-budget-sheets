export type DebtType = 'owe_me' | 'i_owe';

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  owe_me: 'They owe me',
  i_owe: 'I owe them',
};
