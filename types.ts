
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
  rowIndex?: number;
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
  rowIndex?: number;
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

export interface PortfolioLogEntry {
  date: string;
  accounts: Record<string, number>;
}

export interface ProcessedPortfolioEntry extends PortfolioLogEntry {
  totalValue: number;
  percentChange: number;
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

export interface LedgerItem {
  name: string;
  monthlyValues: number[];
  total: number;
  rowIndex?: number;
}

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

/**
 * TEMPORAL ENGINE TYPES
 */
export interface NormalizedTransaction {
    id: string;
    date: string;
    category: string;
    subCategory: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
}

export interface DimensionNode {
    name: string;
    total: number;
    count: number;
    subDimensions?: Record<string, DimensionNode>;
}

export interface CustomDateRange {
    start: string;
    end: string;
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
    portfolioLog: string;
    debt: string;
    income: string;
    expenses: string;
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
  ANALYTICS = 'ANALYTICS',
  INFORMATION = 'INFORMATION',
  SETTINGS = 'SETTINGS',
  PRIVACY = 'PRIVACY',
  TERMS = 'TERMS'
}

export enum TimeFocus {
  MTD = 'MTD',
  QTD = 'QTD',
  YTD = 'YTD',
  ROLLING_12M = 'ROLLING_12M',
  FULL_YEAR = 'FULL_YEAR',
  CUSTOM = 'CUSTOM'
}

export type AnalyticsSubView = 'FLOW' | 'PORTFOLIO';

export type ExchangeRates = Record<string, number>;

export interface TourStep {
  targetId: string;
  title: string;
  content: string;
  view: ViewState;
}

export interface AttributionResult {
  startValue: number;
  endValue: number;
  netContributions: number;
  marketGain: number;
  percentageReturn: number;
}

export interface ArchiveMeta {
  year: number;
  records: number;
  lastUpdated: string;
}
