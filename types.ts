
export interface Asset {
  id: string;
  rowIndex?: number; // Added for deletion logic
  name: string;
  type: string;
  value: number;
  currency: string;
  lastUpdated?: string;
}

export interface Investment {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  accountName: string;
  assetClass: string;
  marketValue?: number;
}

export interface Trade {
  id: string;
  rowIndex?: number; // Added for deletion logic
  date: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  fee?: number;
  marketPrice?: number;
}

export interface Subscription {
  id: string;
  rowIndex?: number;
  name: string;
  cost: number;
  period: 'Monthly' | 'Yearly' | 'Weekly' | 'Other';
  category: string;
  active: boolean;
  paymentMethod?: string;
}

export interface BankAccount {
  id: string;
  rowIndex?: number;
  name: string;
  institution: string;
  type: string;
  paymentType: string;
  accountNumber: string;
  transactionType: string;
  currency: string;
  purpose: string;
}

export interface DebtEntry {
  id: string;
  name: string;
  amountOwed: number;
  interestRate: number;
  monthlyPayment: number;
}

export interface NetWorthEntry {
  date: string;
  value: number;
  currency?: string;
}

export interface IncomeEntry {
  date: string;
  monthStr: string;
  amount: number;
}

export interface ExpenseEntry {
  date: string;
  monthStr: string;
  categories: Record<string, number>;
  total: number;
}

export interface IncomeAndExpenses {
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
}

// Unified Ledger Types (Used for both Income and Expenses)
export interface LedgerItem {
  name: string;
  monthlyValues: number[]; // Index 0 = Jan, 11 = Dec
  total: number;
  rowIndex?: number; // Added for editing
}

export interface LedgerCategory {
  name: string;
  subCategories: LedgerItem[];
  total: number;
  rowIndex?: number; // Added for editing
}

export interface LedgerData {
    months: string[]; // e.g., ["Jan", "Feb", ...]
    categories: LedgerCategory[];
}

export interface SheetConfig {
  sheetId: string;
  clientId: string; // Added for OAuth
  tabNames: {
    assets: string;
    investments: string;
    trades: string;
    subscriptions: string;
    accounts: string;
    logData: string;
    debt: string;
    income: string;
    expenses: string; // Separate tab for detailed category breakdown
  };
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  ASSETS = 'ASSETS',
  INVESTMENTS = 'INVESTMENTS',
  TRADES = 'TRADES',
  INCOME = 'INCOME',
  INFORMATION = 'INFORMATION',
  SETTINGS = 'SETTINGS'
}

export type ExchangeRates = Record<string, number>;