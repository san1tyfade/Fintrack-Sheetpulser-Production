

export interface Asset {
  id: string;
  rowIndex?: number;
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
  rowIndex?: number;
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
  date?: string;
}

export interface TaxRecord {
  id: string;
  rowIndex?: number;
  recordType: string;
  accountFund: string;
  transactionType: string;
  date: string;
  value: number;
  description: string;
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

// Added missing LedgerItem interface to resolve compilation errors
export interface LedgerItem {
  name: string;
  monthlyValues: number[];
  total: number;
  rowIndex?: number;
}

// Added missing LedgerCategory interface to resolve compilation errors
export interface LedgerCategory {
  name: string;
  subCategories: LedgerItem[];
  total: number;
  rowIndex?: number;
}

export interface LedgerData {
    months: string[];
    categories: LedgerCategory[];
}

export interface SheetConfig {
  sheetId: string;
  clientId: string;
  tabNames: {
    assets: string;
    investments: string;
    trades: string;
    subscriptions: string;
    accounts: string;
    logData: string;
    debt: string;
    income: string;
    expenses: string;
    taxAccounts: string;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  ASSETS = 'ASSETS',
  INVESTMENTS = 'INVESTMENTS',
  TRADES = 'TRADES',
  INCOME = 'INCOME',
  INFORMATION = 'INFORMATION',
  SETTINGS = 'SETTINGS',
  PRIVACY = 'PRIVACY',
  TERMS = 'TERMS'
}

export type ExchangeRates = Record<string, number>;

export interface TourStep {
  targetId: string;
  title: string;
  content: string;
  view: ViewState;
}