
import { Asset, Investment, Trade, Subscription, BankAccount, NetWorthEntry, DebtEntry, IncomeEntry, ExpenseEntry, IncomeAndExpenses, DetailedExpenseData, DetailedIncomeData, ExpenseCategory, ExpenseSubCategory } from "../types";

// --- Utilities ---

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Security: Prevent Prototype Pollution and Property Shadowing
export const isSafeKey = (key: string) => {
    const forbidden = [
        '__proto__', 
        'constructor', 
        'prototype', 
        'toString', 
        'valueOf', 
        'toLocaleString', 
        'hasOwnProperty', 
        'isPrototypeOf', 
        'propertyIsEnumerable'
    ];
    return !!key && !forbidden.includes(key.trim());
};

const TICKER_ALIASES: Record<string, string> = {
  'ETHERUM': 'ETH',
  'ETHERIUM': 'ETH',
  'ETHEREUM': 'ETH',
  'ETHER': 'ETH',
  'BITCOIN': 'BTC',
  'LITECOIN': 'LTC',
  'SOLANA': 'SOL',
  'CARDANO': 'ADA',
  'RIPPLE': 'XRP',
  'DOGECOIN': 'DOGE'
};

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const HEADER_KEYWORDS: Record<string, string[]> = {
    assets: ['name', 'value', 'amount', 'balance', 'asset', 'account'],
    investments: ['ticker', 'symbol', 'quantity', 'qty', 'avg', 'cost'],
    trades: ['date', 'ticker', 'symbol', 'qty', 'price', 'type'],
    subscriptions: ['name', 'service', 'cost', 'price', 'period', 'active'],
    accounts: ['institution', 'bank', 'account', 'type', 'card'],
    logData: ['date', 'worth', 'total', 'balance', 'net'],
    debt: ['name', 'owed', 'rate', 'payment', 'loan']
};

export const normalizeTicker = (ticker: string): string => {
  if (!ticker) return 'UNKNOWN';
  let clean = ticker.toUpperCase().trim();
  
  if (clean.includes('(')) {
    clean = clean.replace(/\s*\(.*?\)\s*/g, '');
  }

  if (clean.includes('-') || clean.includes('.') || clean.includes('/')) {
      const parts = clean.split(/[-./]/);
      if (parts.length > 0 && parts[0].length > 0) {
          clean = parts[0];
      }
  }

  clean = clean.trim();
  if (TICKER_ALIASES[clean]) return TICKER_ALIASES[clean];
  
  for (const key in TICKER_ALIASES) {
      if (clean.startsWith(key)) return TICKER_ALIASES[key];
  }
  return clean;
};

const parseCSVLine = (line: string): string[] => {
  if (!line.includes('"')) {
      return line.split(',').map(v => v.trim());
  }

  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  const len = line.length;
  
  for (let i = 0; i < len; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"'));
};

const parseNumber = (val: string | undefined): number => {
  if (!val) return 0;
  if (!isNaN(Number(val)) && !val.includes(',')) return parseFloat(val);

  let clean = val.trim();
  if (clean.startsWith('(') && clean.endsWith(')')) clean = '-' + clean.slice(1, -1);
  clean = clean.replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const formatDateToLocalISO = (dateObj: Date): string => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Parses various date formats (e.g., "Jan-24", "Jan 24", "2024-01-01", "01/31/2024") into ISO string (YYYY-MM-DD).
 */
const parseFlexibleDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.length < 2) return null; 
    
    const cleanStr = dateStr.trim();
    
    // 1. Explicit Regex Matching for numeric formats
    const isoMatch = cleanStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
        const y = parseInt(isoMatch[1]);
        const m = parseInt(isoMatch[2]);
        const d = parseInt(isoMatch[3]);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return formatDateToLocalISO(new Date(y, m - 1, d));
        }
    }

    const usMatch = cleanStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (usMatch) {
        const m = parseInt(usMatch[1]);
        const d = parseInt(usMatch[2]);
        const y = parseInt(usMatch[3]);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return formatDateToLocalISO(new Date(y, m - 1, d));
        }
    }
    
    // 2. Existing Month-Name Logic
    const lower = cleanStr.toLowerCase();
    const normalized = lower.replace(/[\s,]+/g, '-');
    const mName = MONTH_NAMES.find(m => normalized.startsWith(m));
    if (mName) {
        const monthIndex = MONTH_NAMES.indexOf(mName);
        const remainder = normalized.replace(mName, '').replace(/[^0-9]/g, '');
        let year = new Date().getFullYear();
        if (remainder.length === 2) year = 2000 + parseInt(remainder);
        else if (remainder.length === 4) year = parseInt(remainder);
        return formatDateToLocalISO(new Date(year, monthIndex, 1));
    }

    // 3. Standard Date Parse
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990) {
        return formatDateToLocalISO(d);
    }
    return null;
};

const normalizeHeader = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const resolveColumnIndex = (headers: string[], keys: string[]): number => {
  const normalizedHeaders = headers.map(h => normalizeHeader(h));
  for (const key of keys) {
    const normKey = normalizeHeader(key);
    const exactIdx = normalizedHeaders.indexOf(normKey);
    if (exactIdx !== -1) return exactIdx;
    const partialIdx = normalizedHeaders.findIndex(h => h.includes(normKey));
    if (partialIdx !== -1) return partialIdx;
  }
  return -1;
};

const resolveIndices = (headers: string[], mapping: Record<string, string[]>) => {
    const indices: Record<string, number> = {};
    for (const key in mapping) {
        indices[key] = resolveColumnIndex(headers, mapping[key]);
    }
    return indices;
};

// --- Specialized Parser Factories ---

const createAssetParser = (headers: string[]) => {
    const idx = resolveIndices(headers, {
        name: ['name', 'account', 'asset', 'item', 'description', 'holding', 'security'],
        type: ['type', 'category', 'class', 'asset type', 'kind'],
        value: ['value', 'amount', 'balance', 'current value', 'market value', 'total', 'market val'],
        currency: ['currency', 'curr', 'ccy'],
        lastUpdated: ['last updated', 'date', 'updated', 'as of']
    });

    return (values: string[]): Asset | null => {
        const name = (idx.name !== -1 ? values[idx.name] : '') || 'Unknown Asset';
        const value = parseNumber(idx.value !== -1 ? values[idx.value] : '0');
        if (name === 'Unknown Asset' && value === 0) return null;
        let type = (idx.type !== -1 ? values[idx.type] : '') || 'Other';
        const currency = (idx.currency !== -1 ? values[idx.currency] : '') || 'CAD';
        const lastUpdated = idx.lastUpdated !== -1 ? values[idx.lastUpdated] : undefined;
        const nameLower = name.toLowerCase();
        if (nameLower.includes('fhsa')) type = 'FHSA';
        else if (nameLower.includes('tfsa')) type = 'TFSA';
        else if (nameLower.includes('rrsp')) type = 'RRSP';
        else if (nameLower.includes('crypto') || nameLower.includes('btc') || nameLower.includes('eth')) type = 'Crypto';
        else if (nameLower.includes('fund') || nameLower.includes('savings')) type = 'Cash';
        else if (nameLower.includes('car') || nameLower.includes('vehicle')) type = 'Personal Property';
        else if (nameLower.includes('house') || nameLower.includes('real estate') || nameLower.includes('property') || nameLower.includes('condo')) type = 'Real Estate';
        return { id: generateId(), name, type, value, currency, lastUpdated };
    };
};

const createInvestmentParser = (headers: string[]) => {
    const idx = resolveIndices(headers, {
        name: ['name', 'description', 'investment', 'security', 'company'],
        ticker: ['ticker', 'symbol', 'code', 'stock', 'instrument'],
        qty: ['quantity', 'qty', 'units', 'shares', 'count'],
        avgPrice: ['avg price', 'average price', 'cost', 'avg cost', 'book value', 'acb', 'unit cost'],
        currentPrice: ['current price', 'price', 'market price', 'market value', 'unit price', 'last price'],
        account: ['account', 'account name', 'location', 'held in', 'portfolio'],
        class: ['asset class', 'class', 'type', 'category', 'sector'],
        marketValue: ['market value', 'value', 'total value', 'market val']
    });

    return (values: string[]): Investment | null => {
        const name = (idx.name !== -1 ? values[idx.name] : '') || 'Unknown Investment';
        const ticker = (idx.ticker !== -1 ? values[idx.ticker] : '') || name;
        const quantity = parseNumber(idx.qty !== -1 ? values[idx.qty] : '0');
        if (ticker === 'Unknown Investment' && quantity === 0) return null;
        const avgPrice = parseNumber(idx.avgPrice !== -1 ? values[idx.avgPrice] : '0');
        const currentPrice = parseNumber(idx.currentPrice !== -1 ? values[idx.currentPrice] : '0');
        const accountName = (idx.account !== -1 ? values[idx.account] : '') || 'Uncategorized';
        const assetClass = (idx.class !== -1 ? values[idx.class] : '') || 'Other';
        const marketValue = parseNumber(idx.marketValue !== -1 ? values[idx.marketValue] : '0');
        let finalPrice = currentPrice;
        if (finalPrice === 0 && quantity !== 0 && marketValue !== 0) finalPrice = marketValue / quantity;
        return { id: generateId(), ticker, name, quantity, avgPrice, currentPrice: finalPrice, accountName, assetClass, marketValue };
    };
};

const createTradeParser = (headers: string[]) => {
    const idx = resolveIndices(headers, {
        date: ['date', 'time', 'trade date', 'executed'],
        ticker: ['ticker', 'symbol', 'code', 'asset', 'product', 'security', 'instrument'],
        qty: ['quantity', 'qty', 'shares', 'units', 'volume'],
        type: ['type', 'action', 'side', 'transaction', 'buy/sell'],
        price: ['purchase price', 'buy price', 'execution price', 'exec price', 'unit cost', 'cost', 'unit price', 'fill price', 'price', 'amount', 'rate'],
        marketPrice: ['current price', 'market price', 'last price', 'current', 'close', 'live price', 'mark'],
        total: ['total', 'value', 'total value', 'net amount', 'settlement'],
        fee: ['fee', 'commission', 'transaction fee']
    });

    return (values: string[]): Trade | null => {
        const ticker = (idx.ticker !== -1 ? values[idx.ticker] : '') || 'UNKNOWN';
        if (ticker === 'UNKNOWN') return null;
        const date = (idx.date !== -1 ? values[idx.date] : '') || new Date().toISOString().split('T')[0];
        let quantity = parseNumber(idx.qty !== -1 ? values[idx.qty] : '0');
        const rawType = (idx.type !== -1 ? values[idx.type] : '').toUpperCase();
        let type: 'BUY' | 'SELL' = 'BUY';
        if (rawType.includes('SELL') || rawType.includes('SOLD') || rawType.includes('OUT') || quantity < 0) type = 'SELL';
        let price = parseNumber(idx.price !== -1 ? values[idx.price] : '0');
        let total = parseNumber(idx.total !== -1 ? values[idx.total] : '0');
        const fee = parseNumber(idx.fee !== -1 ? values[idx.fee] : '0');
        const marketPrice = parseNumber(idx.marketPrice !== -1 ? values[idx.marketPrice] : '0');
        if (total === 0 && quantity !== 0 && price !== 0) total = quantity * price;
        if (price === 0 && quantity !== 0 && total !== 0) price = total / quantity;
        return { id: generateId(), date, ticker, type, quantity: Math.abs(quantity), price: Math.abs(price), total: Math.abs(total), fee, marketPrice: Math.abs(marketPrice) };
    };
};

const createSubscriptionParser = (headers: string[]) => {
    const idx = resolveIndices(headers, {
        name: ['name', 'service', 'subscription', 'item', 'merchant', 'description'],
        cost: ['cost', 'price', 'amount', 'monthly cost', 'value', 'payment'],
        period: ['period', 'frequency', 'billing cycle'],
        category: ['category', 'type', 'kind'],
        active: ['active', 'status'],
        method: ['payment method', 'account', 'card', 'source']
    });

    return (values: string[]): Subscription | null => {
        const name = (idx.name !== -1 ? values[idx.name] : '') || 'Unknown Service';
        const cost = parseNumber(idx.cost !== -1 ? values[idx.cost] : '0');
        if (cost <= 0 && name === 'Unknown Service') return null;
        const period = (idx.period !== -1 ? values[idx.period] : '') || 'Monthly';
        const category = (idx.category !== -1 ? values[idx.category] : '') || 'General';
        const activeRaw = idx.active !== -1 ? values[idx.active] : '';
        const active = activeRaw ? !['false', 'no', 'inactive', 'cancelled'].includes(activeRaw.toLowerCase()) : true;
        const paymentMethod = (idx.method !== -1 ? values[idx.method] : '') || '';
        return { id: generateId(), name, cost, period: period as any, category, active, paymentMethod };
    };
};

const createAccountParser = (headers: string[]) => {
    const idx = resolveIndices(headers, {
        institution: ['institution', 'bank', 'provider', 'financial institution', 'source'],
        name: ['name', 'account name', 'nickname', 'label', 'account'],
        type: ['type', 'category', 'account type'],
        paymentType: ['payment type', 'method', 'network', 'card type'],
        num: ['account number', 'number', 'last 4', 'card number'],
        transType: ['transaction type', 'class'],
        purpose: ['purpose', 'description', 'usage', 'merchant']
    });

    return (values: string[]): BankAccount | null => {
        const institution = (idx.institution !== -1 ? values[idx.institution] : '') || 'Unknown Bank';
        const name = (idx.name !== -1 ? values[idx.name] : '') || 'Account';
        if (institution === 'Unknown Bank' && name === 'Account') return null;
        const type = (idx.type !== -1 ? values[idx.type] : '') || 'Checking';
        const paymentType = (idx.paymentType !== -1 ? values[idx.paymentType] : '') || 'Card';
        let accountNumber = (idx.num !== -1 ? values[idx.num] : '') || '****';
        if (accountNumber.length > 4) accountNumber = accountNumber.slice(-4);
        let transactionType = (idx.transType !== -1 ? values[idx.transType] : '') || '';
        if (!transactionType) {
            const combined = (type + ' ' + paymentType + ' ' + name).toLowerCase();
            transactionType = (combined.includes('credit') || combined.includes('visa') || combined.includes('mastercard') || combined.includes('amex')) ? 'Credit' : 'Debit';
        }
        const purpose = (idx.purpose !== -1 ? values[idx.purpose] : '') || 'General';
        return { id: generateId(), institution, name, type, paymentType, accountNumber, transactionType, currency: 'CAD', purpose };
    };
};

const createLogDataParser = (headers: string[]) => {
    const idx = resolveIndices(headers, {
        date: ['date', 'time', 'timestamp', 'week ending'],
        value: ['net worth', 'total', 'value', 'amount', 'balance', 'equity']
    });

    return (values: string[]): NetWorthEntry | null => {
        const dateStr = (idx.date !== -1 ? values[idx.date] : values[0]) || '';
        const valStr = (idx.value !== -1 ? values[idx.value] : values[1]) || '';
        const value = parseNumber(valStr);
        if (!dateStr && value === 0) return null;
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return null;
        if (dateObj.getFullYear() === 2001 && !dateStr.includes('2001')) {
            dateObj.setFullYear(new Date().getFullYear());
        }
        return { date: formatDateToLocalISO(dateObj), value };
    };
};

const createDebtParser = (headers: string[]) => {
    const idx = resolveIndices(headers, {
        name: ['name', 'debt name', 'loan', 'description', 'type', 'account', 'student loan'],
        owed: ['remaining', 'loan remaining', 'debt owed', 'amount', 'balance', 'principal', 'debt'],
        rate: ['interest rate', 'rate', 'apr', 'interest'],
        payment: ['monthly payment', 'payment', 'min payment', 'monthly']
    });

    return (values: string[]): DebtEntry | null => {
        let name = (idx.name !== -1 ? values[idx.name] : '') || 'Loan';
        if (!isNaN(parseFloat(name)) && name.match(/^\$?\d/)) name = 'Loan';
        const amountOwed = parseNumber(idx.owed !== -1 ? values[idx.owed] : '0');
        const interestRate = parseNumber(idx.rate !== -1 ? values[idx.rate] : '0');
        const monthlyPayment = parseNumber(idx.payment !== -1 ? values[idx.payment] : '0');
        if (amountOwed === 0 && monthlyPayment === 0 && interestRate === 0) return null;
        return { id: generateId(), name, amountOwed, interestRate, monthlyPayment };
    };
};

// --- Detailed Income Parser ---
export const parseDetailedIncome = (lines: string[]): DetailedIncomeData => {
    const categories: ExpenseCategory[] = []; // Reusing ExpenseCategory as structure is identical
    
    // As per user spec: "First two rows are empty".
    // We expect header around index 2.
    // However, A:ZZ fetch returns empty rows, so line 0, 1 are empty.
    // Line 2 is potentially the header row (Month Names).
    // Line 3+ is data.
    
    let headerIdx = -1;
    let bestMonthCount = 0;

    // Scan the first 10 lines to find the header row (Month names)
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const row = parseCSVLine(lines[i]);
        let count = 0;
        // Count how many cells look like months
        for (let j = 1; j <= 12; j++) {
            const val = (row[j] || '').trim().toLowerCase();
            if (val && MONTH_NAMES.some(m => val.startsWith(m))) count++;
        }
        
        // Income headers often have empty A1, but filled B1..M1
        if (count > bestMonthCount) {
            bestMonthCount = count;
            headerIdx = i;
        }
    }

    if (headerIdx === -1 || headerIdx >= lines.length - 1) return { months: [], categories: [] };

    const headerRow = parseCSVLine(lines[headerIdx]);
    const months: string[] = [];
    for (let j = 1; j <= 12; j++) months.push(headerRow[j] ? headerRow[j].trim() : `Month ${j}`);

    const incomeSourceCategory: ExpenseCategory = {
        name: 'Income Sources',
        subCategories: [],
        total: 0,
        rowIndex: headerIdx
    };

    for (let i = headerIdx + 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        const name = (row[0] || '').trim();
        
        // Stop if we encounter an empty row (end of table section)
        if (!name) {
            // If we have already collected data, an empty row signifies the end of this block
            if (incomeSourceCategory.subCategories.length > 0) break;
            continue; 
        }
        
        if (!isSafeKey(name)) continue;
        
        const lowerName = name.toLowerCase();
        
        // Stop if we hit a 'Total' row, which usually concludes the income table
        if (lowerName === 'total' || lowerName.includes('total income')) {
            break;
        }
        
        // Stop if we hit explicit expense headers (failsafe)
        if (lowerName.includes('expense') || lowerName.includes('outgoing') || lowerName.includes('liabilities')) {
            break;
        }

        const monthlyValues: number[] = [];
        let rowTotal = 0;
        let hasData = false;

        for (let j = 1; j <= 12; j++) {
            const val = parseNumber(row[j]);
            monthlyValues.push(val);
            rowTotal += val;
            if (val !== 0) hasData = true;
        }

        if (hasData) {
            incomeSourceCategory.subCategories.push({
                name: name,
                monthlyValues: monthlyValues,
                total: rowTotal,
                rowIndex: i
            });
            incomeSourceCategory.total += rowTotal;
        }
    }

    if (incomeSourceCategory.subCategories.length > 0) {
        categories.push(incomeSourceCategory);
    }

    return { months, categories };
};

// --- Detailed Expense Parser ---
export const parseDetailedExpenses = (lines: string[]): DetailedExpenseData => {
    const categories: ExpenseCategory[] = [];
    let headerIdx = -1;
    let bestMonthCount = 0;
    
    // Find Header Row
    // Updated limit to 50 to accommodate forced A:ZZ range fetching which might include empty rows
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const row = parseCSVLine(lines[i]);
        let count = 0;
        for (let j = 1; j <= 12; j++) {
            const val = (row[j] || '').trim().toLowerCase();
            if (val && MONTH_NAMES.some(m => val.startsWith(m))) count++;
        }
        const isTitleRow = (row[0] || '').toLowerCase().includes("expense categorie");
        if (count > bestMonthCount) {
            bestMonthCount = count;
            headerIdx = i;
        } else if (count === bestMonthCount && count > 0 && isTitleRow) {
             headerIdx = i;
        }
    }
    
    // Fallback logic for finding header
    if (headerIdx === -1 || bestMonthCount < 2) {
         for (let i = 0; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]);
            if (row[0] && row[0].toLowerCase().includes("expense categorie")) {
                headerIdx = row[1] ? i : i + 1;
                break;
            }
        }
    }
    
    if (headerIdx === -1 || headerIdx >= lines.length - 1) return { months: [], categories: [] };
    
    const headerRow = parseCSVLine(lines[headerIdx]);
    const months: string[] = [];
    for (let j = 1; j <= 12; j++) months.push(headerRow[j] ? headerRow[j].trim() : `Month ${j}`);
    
    let currentCategory: ExpenseCategory | null = null;
    
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        const name = (row[0] || '').trim();
        const lowerName = name.toLowerCase();
        
        if (!name) {
            if (currentCategory) { categories.push(currentCategory); currentCategory = null; }
            continue;
        }
        
        if (!isSafeKey(name)) continue;
        if (name.toUpperCase() === 'TOTAL' || lowerName.includes('net income') || lowerName.includes('total monthly') || lowerName.includes('expense categorie')) continue;
        
        const monthlyValues: number[] = [];
        let hasData = false;
        let totalRowSum = 0;
        
        for (let j = 1; j <= 12; j++) {
            const val = parseNumber(row[j]);
            monthlyValues.push(val);
            if (val !== 0) hasData = true;
            totalRowSum += val;
        }
        
        if (!hasData) {
            // It's a header for a new category
            if (currentCategory) categories.push(currentCategory);
            currentCategory = { name: name, subCategories: [], total: 0, rowIndex: i };
        } else {
            // It's a data row
            const subItem: ExpenseSubCategory = { name, monthlyValues, total: totalRowSum, rowIndex: i };
            if (currentCategory) { 
                currentCategory.subCategories.push(subItem); 
                currentCategory.total += totalRowSum; 
            } else { 
                // Implicit category if none started yet
                categories.push({ name: name, subCategories: [subItem], total: totalRowSum, rowIndex: i }); 
            }
        }
    }
    
    if (currentCategory && !categories.find(c => c.name === currentCategory?.name)) categories.push(currentCategory);
    return { months, categories };
};

// --- Legacy High-Level Parser ---
const parseIncomeAndExpenses = (lines: string[]): IncomeAndExpenses => {
    const incomeEntries: IncomeEntry[] = [];
    const expenseEntries: ExpenseEntry[] = [];
    const parsedLines: { [index: number]: string[] } = {};
    const dateRowIndices: number[] = [];
    let bestIncomeRowIndex = -1;
    let bestIncomePriority = 0; 
    const expenseRows: { name: string; rowIndex: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        parsedLines[i] = row;
        const firstCell = (row[0] || '').trim();
        const lowerFirst = firstCell.toLowerCase();
        let dateCount = 0;
        for (let c = 1; c < Math.min(row.length, 6); c++) if (parseFlexibleDate(row[c])) dateCount++;
        if (dateCount >= 2) { dateRowIndices.push(i); continue; }
        if (lowerFirst.includes('income') && !lowerFirst.includes('net')) {
             let hasData = false;
             for (let c = 1; c < row.length; c++) if (parseNumber(row[c]) !== 0) { hasData = true; break; }
             if (hasData) {
                 const priority = lowerFirst.includes('total') ? 2 : 1;
                 if (priority > bestIncomePriority) { bestIncomeRowIndex = i; bestIncomePriority = priority; }
                 else if (priority === bestIncomePriority && bestIncomeRowIndex === -1) bestIncomeRowIndex = i;
             }
             continue; 
        }
        if (lowerFirst && !lowerFirst.includes('net income') && !lowerFirst.includes('total') && !lowerFirst.includes('monthly savings') && !lowerFirst.includes('balance') && !lowerFirst.includes('expense categorie')) {
               let hasNumericData = false;
               for(let c = 1; c < row.length; c++) if (parseNumber(row[c]) !== 0) { hasNumericData = true; break; }
               if (hasNumericData) expenseRows.push({ name: firstCell, rowIndex: i });
           }
    }
    let incomeDateRowIndex = -1;
    if (bestIncomeRowIndex !== -1) {
        for (let j = dateRowIndices.length - 1; j >= 0; j--) if (dateRowIndices[j] < bestIncomeRowIndex) { incomeDateRowIndex = dateRowIndices[j]; break; }
    }
    if (bestIncomeRowIndex !== -1 && incomeDateRowIndex !== -1) {
        const dateRow = parsedLines[incomeDateRowIndex];
        const valRow = parsedLines[bestIncomeRowIndex];
        for (let c = 1; c < dateRow.length; c++) {
            if (c >= valRow.length) break;
            const iso = parseFlexibleDate(dateRow[c]);
            const val = parseNumber(valRow[c]);
            if (iso) incomeEntries.push({ date: iso, monthStr: dateRow[c], amount: val });
        }
    }
    if (expenseRows.length > 0 && dateRowIndices.length > 0) {
        const dateRow = parsedLines[dateRowIndices[0]];
        for (let c = 1; c < dateRow.length; c++) {
            const iso = parseFlexibleDate(dateRow[c]);
            if (!iso) continue;
            const categories: Record<string, number> = {};
            let total = 0;
            expenseRows.forEach(exp => {
                if (!isSafeKey(exp.name)) return;
                const val = Math.abs(parseNumber(parsedLines[exp.rowIndex][c] || '0'));
                categories[exp.name] = val;
                total += val;
            });
            if (total > 0) expenseEntries.push({ date: iso, monthStr: dateRow[c], categories, total });
        }
    }
    const sortByDate = (a: any, b: any) => a.date.localeCompare(b.date);
    return { income: incomeEntries.sort(sortByDate), expenses: expenseEntries.sort(sortByDate) };
};

export const parseRawData = async <T,>(
  rawData: string,
  dataType: 'assets' | 'investments' | 'trades' | 'subscriptions' | 'accounts' | 'logData' | 'debt' | 'income' | 'detailedExpenses' | 'detailedIncome'
): Promise<T> => {
  if (!rawData) {
      if (dataType === 'income') return { income: [], expenses: [] } as T;
      if (dataType === 'detailedExpenses') return { months: [], categories: [] } as T;
      if (dataType === 'detailedIncome') return { months: [], categories: [] } as T;
      return [] as T;
  }
  const lines = rawData.split(/\r?\n/);
  if (lines.length < 2) {
      if (dataType === 'income') return { income: [], expenses: [] } as T;
      if (dataType === 'detailedExpenses') return { months: [], categories: [] } as T;
      if (dataType === 'detailedIncome') return { months: [], categories: [] } as T;
      return [] as T; 
  }
  if (dataType === 'income') return parseIncomeAndExpenses(lines) as T;
  if (dataType === 'detailedExpenses') return parseDetailedExpenses(lines) as T;
  if (dataType === 'detailedIncome') return parseDetailedIncome(lines) as T;

  // --- Robust Header Detection ---
  let headerIndex = -1;
  const keywords = HEADER_KEYWORDS[dataType] || [];
  
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const rowValues = parseCSVLine(line).map(v => v.toLowerCase().trim());
      
      const nonEmptyCells = rowValues.filter(v => v !== '');
      const hasEnoughCols = nonEmptyCells.length >= 2;
      const hasKeyword = keywords.some(k => rowValues.some(v => v.includes(k)));
      const isTitleRow = nonEmptyCells.length === 1;

      if (hasEnoughCols && hasKeyword && !isTitleRow) {
          headerIndex = i;
          break;
      }
  }

  if (headerIndex === -1) {
      for (let i = 0; i < lines.length; i++) if (lines[i].trim().length > 0) { headerIndex = i; break; }
  }
  
  if (headerIndex === -1) return [] as T;

  const originalHeaders = parseCSVLine(lines[headerIndex]);
  let parser: ((values: string[]) => any | null) | null = null;
  switch(dataType) {
      case 'assets': parser = createAssetParser(originalHeaders); break;
      case 'investments': parser = createInvestmentParser(originalHeaders); break;
      case 'trades': parser = createTradeParser(originalHeaders); break;
      case 'subscriptions': parser = createSubscriptionParser(originalHeaders); break;
      case 'accounts': parser = createAccountParser(originalHeaders); break;
      case 'logData': parser = createLogDataParser(originalHeaders); break;
      case 'debt': parser = createDebtParser(originalHeaders); break;
  }
  if (!parser) return [] as T;

  const results: any[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (dataType === 'debt' && lines[i].trim() === '' && lines[i+1]?.trim() === '') break;
    const values = parseCSVLine(lines[i]);
    if (values.every(v => v === '')) continue;
    const parsedItem = parser(values);
    if (parsedItem) {
        if (['trades', 'assets', 'subscriptions', 'accounts'].includes(dataType)) {
            (parsedItem as any).rowIndex = i;
        }
        results.push(parsedItem);
    }
  }
  if (dataType === 'debt') {
      const loanItem = results.find((r: any) => r.name?.toLowerCase().includes('loan'));
      return (loanItem ? [loanItem] : []) as T;
  }
  return results as T;
};