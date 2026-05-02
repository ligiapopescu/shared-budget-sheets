// Synthetic data for demo mode (?demo=1). All values are obviously fake —
// safe to display in screenshots or to anyone evaluating the app without
// going through Google Cloud setup.

import { SHEET_SCHEMAS, SheetName } from './sheetSchema';
import { DEFAULT_EXCHANGE_RATES } from './exchangeRateSeed';

export const DEMO_USER_ID = 'demo-user-alex';
export const DEMO_USER_EMAIL = 'alex@demo.local';
export const DEMO_USER_NAME = 'Alex Chen';

const PARTNER_ID = 'demo-user-sam';
const PARTNER_EMAIL = 'sam@demo.local';
const PARTNER_NAME = 'Sam Rivera';

const HOUSEHOLD_ID = 'hh-demo-1';
const SELF_PERSON_ID = 'hp-self';
const PARTNER_PERSON_ID = 'hp-partner';

// Category groups
const GROUP_ESSENTIALS = 'cg-essentials';
const GROUP_LIFESTYLE = 'cg-lifestyle';
const GROUP_HEALTH = 'cg-health';

// Categories
const CAT_GROCERIES = 'cat-groceries';
const CAT_TRANSPORT = 'cat-transport';
const CAT_UTILITIES = 'cat-utilities';
const CAT_RENT = 'cat-rent';
const CAT_DINING = 'cat-dining';
const CAT_ENTERTAINMENT = 'cat-entertainment';
const CAT_SUBSCRIPTIONS = 'cat-subscriptions';
const CAT_TRAVEL = 'cat-travel';
const CAT_PHARMACY = 'cat-pharmacy';
const CAT_GYM = 'cat-gym';

// ─── Helpers ───────────────────────────────────────────────────────────────

const NOW = new Date('2026-04-30T12:00:00Z');
const NOW_ISO = NOW.toISOString();

function isoDate(monthsAgo: number, day: number): string {
  // Set day=1 first so month-arithmetic doesn't roll over (e.g. April 30 → 2
  // months back would otherwise land on March 2, skipping February entirely).
  const d = new Date(NOW);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  d.setUTCDate(day);
  return d.toISOString().slice(0, 10);
}

function monthYearAgo(monthsAgo: number): { month: number; year: number } {
  const d = new Date(NOW);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

function row(sheetName: SheetName, record: Record<string, string | number | boolean>): string[] {
  return SHEET_SCHEMAS[sheetName].map(col => {
    const v = record[col];
    if (v == null) return '';
    return typeof v === 'string' ? v : String(v);
  });
}

let idCounter = 0;
function id(prefix: string): string { return `${prefix}-${++idCounter}`; }

// ─── Fixture builders ──────────────────────────────────────────────────────

function buildProfiles(): string[][] {
  return [
    row('profiles', {
      id: DEMO_USER_ID, email: DEMO_USER_EMAIL, full_name: DEMO_USER_NAME,
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
    row('profiles', {
      id: PARTNER_ID, email: PARTNER_EMAIL, full_name: PARTNER_NAME,
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
  ];
}

function buildHouseholds(): string[][] {
  return [
    row('households', {
      id: HOUSEHOLD_ID, name: 'Chen-Rivera Household', created_by: DEMO_USER_ID,
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
  ];
}

function buildHouseholdPersons(): string[][] {
  return [
    row('household_persons', {
      id: SELF_PERSON_ID, user_id: DEMO_USER_ID, household_id: HOUSEHOLD_ID,
      name: DEMO_USER_NAME, email: DEMO_USER_EMAIL,
      connected_user_id: DEMO_USER_ID, include_in_household_view: 'true',
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
    row('household_persons', {
      id: PARTNER_PERSON_ID, user_id: DEMO_USER_ID, household_id: HOUSEHOLD_ID,
      name: PARTNER_NAME, email: PARTNER_EMAIL,
      connected_user_id: PARTNER_ID, include_in_household_view: 'true',
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
  ];
}

function buildHouseholdCategoryGroups(): string[][] {
  return [
    row('household_category_groups', {
      id: GROUP_ESSENTIALS, household_id: HOUSEHOLD_ID, name: 'Essentials',
      color: '#ef4444', icon: 'ShoppingBasket', display_order: 0,
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
    row('household_category_groups', {
      id: GROUP_LIFESTYLE, household_id: HOUSEHOLD_ID, name: 'Lifestyle',
      color: '#8b5cf6', icon: 'Sparkles', display_order: 1,
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
    row('household_category_groups', {
      id: GROUP_HEALTH, household_id: HOUSEHOLD_ID, name: 'Health',
      color: '#10b981', icon: 'Heart', display_order: 2,
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
  ];
}

function buildHouseholdCategories(): string[][] {
  const cats: Array<[string, string, string, string]> = [
    [CAT_GROCERIES, 'Groceries', '#f97316', GROUP_ESSENTIALS],
    [CAT_TRANSPORT, 'Transport', '#0ea5e9', GROUP_ESSENTIALS],
    [CAT_UTILITIES, 'Utilities', '#facc15', GROUP_ESSENTIALS],
    [CAT_RENT, 'Rent', '#dc2626', GROUP_ESSENTIALS],
    [CAT_DINING, 'Dining out', '#a855f7', GROUP_LIFESTYLE],
    [CAT_ENTERTAINMENT, 'Entertainment', '#ec4899', GROUP_LIFESTYLE],
    [CAT_SUBSCRIPTIONS, 'Subscriptions', '#6366f1', GROUP_LIFESTYLE],
    [CAT_TRAVEL, 'Travel', '#14b8a6', GROUP_LIFESTYLE],
    [CAT_PHARMACY, 'Pharmacy', '#22c55e', GROUP_HEALTH],
    [CAT_GYM, 'Gym', '#84cc16', GROUP_HEALTH],
  ];
  return cats.map(([cid, name, color, group]) => row('household_categories', {
    id: cid, household_id: HOUSEHOLD_ID, name, color, is_default: 'false',
    group_id: group, created_at: NOW_ISO, updated_at: NOW_ISO,
  }));
}

interface ExpenseSeed {
  monthsAgo: number; day: number; merchant: string; amount: number;
  currency: string; category: string; user: string; description?: string;
}

const EXPENSES: ExpenseSeed[] = [
  // Current month (0)
  { monthsAgo: 0, day: 28, merchant: 'Carrefour', amount: 87.40, currency: 'EUR', category: CAT_GROCERIES, user: DEMO_USER_ID },
  { monthsAgo: 0, day: 27, merchant: 'Uber', amount: 14.20, currency: 'EUR', category: CAT_TRANSPORT, user: DEMO_USER_ID },
  { monthsAgo: 0, day: 25, merchant: 'Spotify', amount: 9.99, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID, description: 'Family plan' },
  { monthsAgo: 0, day: 22, merchant: 'Pizzeria Romana', amount: 42.50, currency: 'EUR', category: CAT_DINING, user: PARTNER_ID },
  { monthsAgo: 0, day: 20, merchant: 'Netflix', amount: 15.49, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 0, day: 18, merchant: 'Lidl', amount: 64.10, currency: 'EUR', category: CAT_GROCERIES, user: PARTNER_ID },
  { monthsAgo: 0, day: 15, merchant: 'EDF Energy', amount: 92.00, currency: 'EUR', category: CAT_UTILITIES, user: DEMO_USER_ID, description: 'Electricity' },
  { monthsAgo: 0, day: 12, merchant: 'McFit', amount: 24.90, currency: 'EUR', category: CAT_GYM, user: DEMO_USER_ID },
  { monthsAgo: 0, day: 10, merchant: 'Cinema Pathé', amount: 28.00, currency: 'EUR', category: CAT_ENTERTAINMENT, user: PARTNER_ID, description: 'Date night' },
  { monthsAgo: 0, day: 5, merchant: 'Landlord SARL', amount: 1450.00, currency: 'EUR', category: CAT_RENT, user: DEMO_USER_ID },
  { monthsAgo: 0, day: 3, merchant: 'Pharmacie du Centre', amount: 17.30, currency: 'EUR', category: CAT_PHARMACY, user: DEMO_USER_ID },

  // 1 month ago
  { monthsAgo: 1, day: 28, merchant: 'Carrefour', amount: 102.85, currency: 'EUR', category: CAT_GROCERIES, user: DEMO_USER_ID },
  { monthsAgo: 1, day: 25, merchant: 'Spotify', amount: 9.99, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 1, day: 22, merchant: 'Amazon Prime', amount: 49.00, currency: 'USD', category: CAT_SUBSCRIPTIONS, user: PARTNER_ID, description: 'Annual renewal' },
  { monthsAgo: 1, day: 20, merchant: 'Netflix', amount: 15.49, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 1, day: 18, merchant: 'SNCF', amount: 64.00, currency: 'EUR', category: CAT_TRANSPORT, user: DEMO_USER_ID, description: 'Paris weekend' },
  { monthsAgo: 1, day: 15, merchant: 'Engie Gas', amount: 78.20, currency: 'EUR', category: CAT_UTILITIES, user: DEMO_USER_ID },
  { monthsAgo: 1, day: 14, merchant: 'Booking.com', amount: 320.00, currency: 'EUR', category: CAT_TRAVEL, user: PARTNER_ID, description: 'Paris hotel' },
  { monthsAgo: 1, day: 12, merchant: 'McFit', amount: 24.90, currency: 'EUR', category: CAT_GYM, user: DEMO_USER_ID },
  { monthsAgo: 1, day: 9, merchant: 'Le Bistrot', amount: 56.40, currency: 'EUR', category: CAT_DINING, user: DEMO_USER_ID },
  { monthsAgo: 1, day: 5, merchant: 'Landlord SARL', amount: 1450.00, currency: 'EUR', category: CAT_RENT, user: DEMO_USER_ID },

  // 2 months ago
  { monthsAgo: 2, day: 27, merchant: 'Lidl', amount: 71.30, currency: 'EUR', category: CAT_GROCERIES, user: PARTNER_ID },
  { monthsAgo: 2, day: 25, merchant: 'Spotify', amount: 9.99, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 2, day: 21, merchant: 'Carrefour', amount: 95.60, currency: 'EUR', category: CAT_GROCERIES, user: DEMO_USER_ID },
  { monthsAgo: 2, day: 20, merchant: 'Netflix', amount: 15.49, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 2, day: 17, merchant: 'EDF Energy', amount: 88.40, currency: 'EUR', category: CAT_UTILITIES, user: DEMO_USER_ID },
  { monthsAgo: 2, day: 14, merchant: 'Pharmacie du Centre', amount: 23.10, currency: 'EUR', category: CAT_PHARMACY, user: PARTNER_ID },
  { monthsAgo: 2, day: 12, merchant: 'McFit', amount: 24.90, currency: 'EUR', category: CAT_GYM, user: DEMO_USER_ID },
  { monthsAgo: 2, day: 8, merchant: 'Pizzeria Romana', amount: 38.00, currency: 'EUR', category: CAT_DINING, user: PARTNER_ID },
  { monthsAgo: 2, day: 5, merchant: 'Landlord SARL', amount: 1450.00, currency: 'EUR', category: CAT_RENT, user: DEMO_USER_ID },
  { monthsAgo: 2, day: 3, merchant: 'Concert tickets', amount: 95.00, currency: 'EUR', category: CAT_ENTERTAINMENT, user: DEMO_USER_ID, description: 'Indie band' },

  // 3 months ago
  { monthsAgo: 3, day: 28, merchant: 'Carrefour', amount: 110.20, currency: 'EUR', category: CAT_GROCERIES, user: DEMO_USER_ID },
  { monthsAgo: 3, day: 25, merchant: 'Spotify', amount: 9.99, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 3, day: 20, merchant: 'Netflix', amount: 15.49, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 3, day: 18, merchant: 'Engie Gas', amount: 105.00, currency: 'EUR', category: CAT_UTILITIES, user: DEMO_USER_ID, description: 'Winter peak' },
  { monthsAgo: 3, day: 15, merchant: 'Uber', amount: 22.80, currency: 'EUR', category: CAT_TRANSPORT, user: PARTNER_ID },
  { monthsAgo: 3, day: 12, merchant: 'McFit', amount: 24.90, currency: 'EUR', category: CAT_GYM, user: DEMO_USER_ID },
  { monthsAgo: 3, day: 9, merchant: 'Le Bistrot', amount: 62.30, currency: 'EUR', category: CAT_DINING, user: DEMO_USER_ID },
  { monthsAgo: 3, day: 5, merchant: 'Landlord SARL', amount: 1450.00, currency: 'EUR', category: CAT_RENT, user: DEMO_USER_ID },

  // 4 months ago
  { monthsAgo: 4, day: 28, merchant: 'Lidl', amount: 88.10, currency: 'EUR', category: CAT_GROCERIES, user: PARTNER_ID },
  { monthsAgo: 4, day: 25, merchant: 'Spotify', amount: 9.99, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 4, day: 20, merchant: 'Netflix', amount: 15.49, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 4, day: 18, merchant: 'EDF Energy', amount: 91.20, currency: 'EUR', category: CAT_UTILITIES, user: DEMO_USER_ID },
  { monthsAgo: 4, day: 12, merchant: 'McFit', amount: 24.90, currency: 'EUR', category: CAT_GYM, user: DEMO_USER_ID },
  { monthsAgo: 4, day: 10, merchant: 'Carrefour', amount: 75.40, currency: 'EUR', category: CAT_GROCERIES, user: DEMO_USER_ID },
  { monthsAgo: 4, day: 5, merchant: 'Landlord SARL', amount: 1450.00, currency: 'EUR', category: CAT_RENT, user: DEMO_USER_ID },

  // 5 months ago
  { monthsAgo: 5, day: 27, merchant: 'Carrefour', amount: 92.80, currency: 'EUR', category: CAT_GROCERIES, user: DEMO_USER_ID },
  { monthsAgo: 5, day: 25, merchant: 'Spotify', amount: 9.99, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 5, day: 20, merchant: 'Netflix', amount: 15.49, currency: 'EUR', category: CAT_SUBSCRIPTIONS, user: DEMO_USER_ID },
  { monthsAgo: 5, day: 17, merchant: 'Engie Gas', amount: 82.00, currency: 'EUR', category: CAT_UTILITIES, user: DEMO_USER_ID },
  { monthsAgo: 5, day: 12, merchant: 'McFit', amount: 24.90, currency: 'EUR', category: CAT_GYM, user: DEMO_USER_ID },
  { monthsAgo: 5, day: 5, merchant: 'Landlord SARL', amount: 1450.00, currency: 'EUR', category: CAT_RENT, user: DEMO_USER_ID },
];

function buildExpenses(): string[][] {
  return EXPENSES.map(e => row('expenses', {
    id: id('exp'), date: isoDate(e.monthsAgo, e.day), merchant: e.merchant,
    amount: e.amount, currency: e.currency, category_id: e.category,
    user_id: e.user, description: e.description ?? '', household_id: HOUSEHOLD_ID,
    created_at: NOW_ISO, updated_at: NOW_ISO,
  }));
}

function buildIncome(): string[][] {
  const rows: string[][] = [];
  for (let m = 0; m < 6; m++) {
    rows.push(row('income', {
      id: id('inc'), date: isoDate(m, 1), source: 'Acme Corp salary',
      amount: 4200, currency: 'EUR', user_id: DEMO_USER_ID, description: 'Monthly net',
      household_id: HOUSEHOLD_ID, created_at: NOW_ISO, updated_at: NOW_ISO,
    }));
    rows.push(row('income', {
      id: id('inc'), date: isoDate(m, 5), source: 'Globex freelance',
      amount: 2800, currency: 'EUR', user_id: PARTNER_ID, description: 'Contract',
      household_id: HOUSEHOLD_ID, created_at: NOW_ISO, updated_at: NOW_ISO,
    }));
  }
  // One USD income to demonstrate multi-currency
  rows.push(row('income', {
    id: id('inc'), date: isoDate(0, 15), source: 'Side gig (US client)',
    amount: 600, currency: 'USD', user_id: DEMO_USER_ID, description: 'Consulting',
    household_id: HOUSEHOLD_ID, created_at: NOW_ISO, updated_at: NOW_ISO,
  }));
  return rows;
}

const SAVINGS_CASH_ID = 'sa-emergency';
const SAVINGS_STOCK_ID = 'sa-vwce';

function buildSavingsAccounts(): string[][] {
  return [
    row('savings_accounts', {
      id: SAVINGS_CASH_ID, user_id: DEMO_USER_ID, name: 'Emergency Fund',
      account_type: 'cash', currency: 'EUR', holding_type: 'cash',
      stock_symbol: '', stock_name: '', description: 'Three months of expenses',
      household_id: HOUSEHOLD_ID, created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
    row('savings_accounts', {
      id: SAVINGS_STOCK_ID, user_id: DEMO_USER_ID, name: 'VWCE ETF',
      account_type: 'stock', currency: 'EUR', holding_type: 'stock',
      stock_symbol: 'VWCE', stock_name: 'Vanguard FTSE All-World',
      description: 'Long-term index', household_id: HOUSEHOLD_ID,
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
  ];
}

function buildSavingsSnapshots(): string[][] {
  const rows: string[][] = [];
  // Cash account: 6 monthly snapshots, slowly growing.
  const cashBalances = [10500, 10800, 11100, 11400, 11800, 12200];
  for (let m = 5; m >= 0; m--) {
    const { month, year } = monthYearAgo(m);
    rows.push(row('savings_snapshots', {
      id: id('snap'), user_id: DEMO_USER_ID, savings_account_id: SAVINGS_CASH_ID,
      month: String(month), year: String(year),
      balance: cashBalances[5 - m], stock_quantity: '', stock_price_per_share: '',
      notes: '', household_id: HOUSEHOLD_ID, created_at: NOW_ISO, updated_at: NOW_ISO,
    }));
  }
  // Stock account: quantity grows monthly, price fluctuates.
  const qtys = [42, 45, 48, 51, 54, 57];
  const prices = [108.5, 110.2, 109.4, 112.8, 115.1, 116.7];
  for (let m = 5; m >= 0; m--) {
    const { month, year } = monthYearAgo(m);
    const qty = qtys[5 - m];
    const price = prices[5 - m];
    rows.push(row('savings_snapshots', {
      id: id('snap'), user_id: DEMO_USER_ID, savings_account_id: SAVINGS_STOCK_ID,
      month: String(month), year: String(year),
      balance: (qty * price).toFixed(2), stock_quantity: String(qty),
      stock_price_per_share: String(price), notes: '', household_id: HOUSEHOLD_ID,
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }));
  }
  return rows;
}

function buildDebtEntries(): string[][] {
  return [
    row('debt_entries', {
      id: id('debt'), user_id: DEMO_USER_ID, household_person_id: PARTNER_PERSON_ID,
      amount: 45.00, currency: 'EUR', description: 'Concert tickets (covered Sam too)',
      date: isoDate(0, 3), type: 'owe_me', expense_id: '', split_method: 'amount',
      split_value: '45.00', resolved: 'false', created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
    row('debt_entries', {
      id: id('debt'), user_id: DEMO_USER_ID, household_person_id: PARTNER_PERSON_ID,
      amount: 32.05, currency: 'EUR', description: 'Half of last grocery run',
      date: isoDate(0, 18), type: 'owe_me', expense_id: '', split_method: 'percentage',
      split_value: '50', resolved: 'false', created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
    row('debt_entries', {
      id: id('debt'), user_id: DEMO_USER_ID, household_person_id: PARTNER_PERSON_ID,
      amount: 21.25, currency: 'EUR', description: 'Pizza Sam paid for',
      date: isoDate(0, 22), type: 'i_owe', expense_id: '', split_method: 'amount',
      split_value: '21.25', resolved: 'false', created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
    row('debt_entries', {
      id: id('debt'), user_id: DEMO_USER_ID, household_person_id: PARTNER_PERSON_ID,
      amount: 14.00, currency: 'EUR', description: 'Cinema (resolved)',
      date: isoDate(1, 18), type: 'owe_me', expense_id: '', split_method: 'amount',
      split_value: '14.00', resolved: 'true', created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
  ];
}

function buildHouseholdInvitations(): string[][] {
  return [
    row('household_invitations', {
      id: id('inv'), inviter_user_id: DEMO_USER_ID, household_person_id: 'hp-pending',
      invited_email: 'jordan@demo.local', invited_user_id: '', status: 'pending',
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
  ];
}

function buildExchangeRates(): string[][] {
  return DEFAULT_EXCHANGE_RATES.map(r => row('exchange_rates', {
    id: id('fx'), from_currency: r.from, to_currency: r.to,
    rate: r.rate, updated_at: NOW_ISO,
  }));
}

function buildAutomationRules(): string[][] {
  return [
    row('expense_automation_rules', {
      id: id('rule'), user_id: DEMO_USER_ID, rule_type: 'categorise',
      merchant_pattern: 'Carrefour', description_pattern: '',
      category_id: CAT_GROCERIES, category_group_id: '',
      household_person_id: '', split_amount: '', split_method: '',
      is_active: 'true', created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
    row('expense_automation_rules', {
      id: id('rule'), user_id: DEMO_USER_ID, rule_type: 'split',
      merchant_pattern: 'Landlord', description_pattern: '',
      category_id: CAT_RENT, category_group_id: '',
      household_person_id: PARTNER_PERSON_ID, split_amount: '50',
      split_method: 'percentage', is_active: 'true',
      created_at: NOW_ISO, updated_at: NOW_ISO,
    }),
  ];
}

function buildMerchantCategories(): string[][] {
  const learned: Array<[string, string]> = [
    ['Carrefour', CAT_GROCERIES],
    ['Lidl', CAT_GROCERIES],
    ['Spotify', CAT_SUBSCRIPTIONS],
    ['Netflix', CAT_SUBSCRIPTIONS],
    ['McFit', CAT_GYM],
    ['Uber', CAT_TRANSPORT],
  ];
  return learned.map(([m, c]) => row('merchant_categories', {
    id: id('mc'), merchant: m, category_id: c, user_id: DEMO_USER_ID,
    last_used: NOW_ISO,
  }));
}

// ─── Public ────────────────────────────────────────────────────────────────

export function buildDemoFixtures(): Record<string, string[][]> {
  idCounter = 0;
  return {
    profiles: buildProfiles(),
    categories: [],
    expenses: buildExpenses(),
    income: buildIncome(),
    households: buildHouseholds(),
    household_persons: buildHouseholdPersons(),
    household_categories: buildHouseholdCategories(),
    household_category_groups: buildHouseholdCategoryGroups(),
    debt_entries: buildDebtEntries(),
    household_invitations: buildHouseholdInvitations(),
    savings_accounts: buildSavingsAccounts(),
    savings_snapshots: buildSavingsSnapshots(),
    merchant_categories: buildMerchantCategories(),
    exchange_rates: buildExchangeRates(),
    expense_automation_rules: buildAutomationRules(),
    user_category_mappings: [],
  };
}
