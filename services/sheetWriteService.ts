
import { getAccessToken } from './authService';
import { Trade, Asset, Subscription, BankAccount } from '../types';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Helper to normalize header strings for comparison
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

// --- Mapping Logic ---

const setCellValue = (row: any[], headers: string[], keys: string[], val: string | number | boolean) => {
    const h = headers.map(normalize);
    let idx = h.findIndex((header, i) => row[i] === null && keys.some(k => header === k));
    if (idx === -1) {
        idx = h.findIndex((header, i) => row[i] === null && keys.some(k => header.includes(k)));
    }
    if (idx !== -1) {
         row[idx] = val;
    }
};

const mapTradeToRow = (trade: Trade, headers: string[]) => {
    const row = new Array(headers.length).fill(null);
    setCellValue(row, headers, ['date', 'time', 'day'], trade.date);
    setCellValue(row, headers, ['ticker', 'symbol', 'code', 'asset'], trade.ticker);
    setCellValue(row, headers, ['quantity', 'qty', 'units', 'shares', 'count', 'amount'], trade.quantity);
    setCellValue(row, headers, ['total', 'value', 'net', 'settlement'], trade.total); 
    setCellValue(row, headers, ['price', 'cost', 'rate', 'unitprice'], trade.price);
    setCellValue(row, headers, ['type', 'action', 'side', 'direction'], trade.type);
    setCellValue(row, headers, ['fee', 'commission', 'transaction', 'charge'], trade.fee || 0);
    return row;
};

const mapAssetToRow = (asset: Asset, headers: string[]) => {
    const row = new Array(headers.length).fill(null);
    setCellValue(row, headers, ['type', 'category', 'class', 'asset type', 'kind'], asset.type);
    setCellValue(row, headers, ['name', 'account', 'item', 'description', 'holding', 'security', 'asset'], asset.name);
    setCellValue(row, headers, ['value', 'amount', 'balance', 'current value', 'market value', 'total', 'market val'], asset.value);
    setCellValue(row, headers, ['currency', 'curr', 'ccy'], asset.currency);
    setCellValue(row, headers, ['last updated', 'date', 'updated', 'as of'], asset.lastUpdated || new Date().toISOString().split('T')[0]);
    return row;
};

const mapSubscriptionToRow = (sub: Subscription, headers: string[]) => {
    const row = new Array(headers.length).fill(null);
    setCellValue(row, headers, ['name', 'service', 'subscription', 'item', 'merchant', 'description'], sub.name);
    setCellValue(row, headers, ['cost', 'price', 'amount', 'monthly cost', 'value', 'payment'], sub.cost);
    setCellValue(row, headers, ['period', 'frequency', 'billing cycle'], sub.period);
    setCellValue(row, headers, ['category', 'type', 'kind'], sub.category);
    setCellValue(row, headers, ['active', 'status'], sub.active ? 'TRUE' : 'FALSE');
    setCellValue(row, headers, ['payment method', 'account', 'card', 'source'], sub.paymentMethod || '');
    return row;
};

const mapAccountToRow = (acc: BankAccount, headers: string[]) => {
    const row = new Array(headers.length).fill(null);
    setCellValue(row, headers, ['institution', 'bank', 'provider', 'source'], acc.institution);
    setCellValue(row, headers, ['name', 'account name', 'nickname', 'label', 'account'], acc.name);
    setCellValue(row, headers, ['type', 'category', 'account type'], acc.type);
    setCellValue(row, headers, ['payment type', 'method', 'network', 'card type'], acc.paymentType);
    setCellValue(row, headers, ['account number', 'number', 'last 4', 'card number'], acc.accountNumber);
    setCellValue(row, headers, ['transaction type', 'class'], acc.transactionType);
    setCellValue(row, headers, ['currency', 'curr', 'ccy'], acc.currency);
    setCellValue(row, headers, ['purpose', 'description', 'usage', 'merchant'], acc.purpose);
    return row;
};

// --- API Helpers ---

const fetchHeaders = async (sheetId: string, tabName: string, token: string) => {
    // We search Row 1 and Row 2 to find headers more robustly
    const range = encodeURIComponent(`${tabName}!A1:Z2`);
    const headerRes = await fetch(`${BASE_URL}/${sheetId}/values/${range}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!headerRes.ok) throw new Error(`Could not find headers in tab '${tabName}'.`);
    const headerJson = await headerRes.json();
    
    // Heuristic: Select row with most non-empty values as header row
    const rows = headerJson.values || [];
    if (rows.length === 0) throw new Error(`Tab '${tabName}' is empty.`);
    
    const bestRow = rows.reduce((best: string[], current: string[]) => 
        (current.filter(v => v).length > best.filter(v => v).length) ? current : best, rows[0]);

    return bestRow;
};

const getSheetGridId = async (spreadsheetId: string, tabName: string, token: string): Promise<number> => {
    const res = await fetch(`${BASE_URL}/${spreadsheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch Spreadsheet metadata.");
    const data = await res.json();
    const sheet = data.sheets?.find((s: any) => s.properties?.title === tabName);
    if (!sheet) throw new Error(`Could not find tab named '${tabName}' in metadata.`);
    return sheet.properties.sheetId;
};

// --- Generic Row Operations ---

const appendToSheet = async (sheetId: string, tabName: string, rowValues: any[]) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");
    const range = encodeURIComponent(`${tabName}!A1`);
    const res = await fetch(`${BASE_URL}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [rowValues] })
    });
    if (!res.ok) throw new Error("Failed to append row.");
    return true;
};

const updateRowInSheet = async (sheetId: string, tabName: string, rowIndex: number, rowValues: any[]) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");
    const rowNumber = rowIndex + 1;
    const range = encodeURIComponent(`${tabName}!A${rowNumber}`);
    const res = await fetch(`${BASE_URL}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [rowValues] })
    });
    if (!res.ok) throw new Error("Failed to update row.");
    return true;
};

// --- Exports ---

export const addTradeToSheet = async (sheetId: string, tabName: string, trade: Trade) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return appendToSheet(sheetId, tabName, mapTradeToRow(trade, headers));
};

export const updateTradeInSheet = async (sheetId: string, tabName: string, rowIndex: number, trade: Trade) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return updateRowInSheet(sheetId, tabName, rowIndex, mapTradeToRow(trade, headers));
};

export const addAssetToSheet = async (sheetId: string, tabName: string, asset: Asset) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return appendToSheet(sheetId, tabName, mapAssetToRow(asset, headers));
};

export const updateAssetInSheet = async (sheetId: string, tabName: string, rowIndex: number, asset: Asset) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return updateRowInSheet(sheetId, tabName, rowIndex, mapAssetToRow(asset, headers));
};

export const addSubscriptionToSheet = async (sheetId: string, tabName: string, sub: Subscription) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return appendToSheet(sheetId, tabName, mapSubscriptionToRow(sub, headers));
};

export const updateSubscriptionInSheet = async (sheetId: string, tabName: string, rowIndex: number, sub: Subscription) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return updateRowInSheet(sheetId, tabName, rowIndex, mapSubscriptionToRow(sub, headers));
};

export const addAccountToSheet = async (sheetId: string, tabName: string, acc: BankAccount) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return appendToSheet(sheetId, tabName, mapAccountToRow(acc, headers));
};

export const updateAccountInSheet = async (sheetId: string, tabName: string, rowIndex: number, acc: BankAccount) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return updateRowInSheet(sheetId, tabName, rowIndex, mapAccountToRow(acc, headers));
};

export const deleteRowFromSheet = async (sheetId: string, tabName: string, rowIndex: number) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");
    const gridId = await getSheetGridId(sheetId, tabName, token);
    const res = await fetch(`${BASE_URL}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requests: [{ deleteDimension: { range: { sheetId: gridId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }]
        })
    });
    if (!res.ok) throw new Error("Failed to delete row.");
    return true;
};

// Helper to convert index 0 -> B, 1 -> C, etc. (Since A is Name)
const getColumnLetter = (index: number) => {
    // Assuming max 26 columns for now (A-Z).
    // Month index 0 = Jan = Column B.
    // So 0 -> B (code 66).
    return String.fromCharCode(66 + index);
};

/**
 * Updates a cell by searching for the row where Column A matches the specific Category/SubCategory structure.
 * This is used for both Income and Expense ledgers.
 */
export const updateLedgerValue = async (sheetId: string, tabName: string, category: string, subCategory: string, monthIndex: number, value: number) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    // 1. Fetch Column A to find the correct row (using the V4 API which respects all rows)
    const colARange = encodeURIComponent(`${tabName}!A:A`);
    const searchRes = await fetch(`${BASE_URL}/${sheetId}/values/${colARange}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!searchRes.ok) throw new Error("Failed to scan sheet for row.");
    const searchData = await searchRes.json();
    const rows = searchData.values || [];

    // 2. Scan for the specific category block and then the sub-item
    let targetRowIndex = -1;
    let foundCategory = false;
    
    // Normalize logic similar to parser
    const norm = (s: string) => (s || '').trim().toLowerCase();

    for (let i = 0; i < rows.length; i++) {
        const cell = rows[i][0] ? rows[i][0].toString() : '';
        const nCell = norm(cell);

        // Header Detection (Optional, but good for context)
        if (!foundCategory && nCell === norm(category)) {
            foundCategory = true;
            // If the subCategory IS the category (implicit single-row), check if this is the only one.
            // But usually the sub-items follow.
        }

        if (foundCategory) {
            if (nCell === norm(subCategory)) {
                targetRowIndex = i;
                break;
            }
        }
    }

    // Fallback: If we couldn't find the structure (maybe implicit category row), 
    // just find the first row that matches the subCategory name exactly.
    if (targetRowIndex === -1) {
        targetRowIndex = rows.findIndex((r: any[]) => norm(r[0]) === norm(subCategory));
    }

    if (targetRowIndex === -1) {
        throw new Error(`Could not find row for '${subCategory}' in sheet.`);
    }

    // 3. Write to the specific cell
    const rowNum = targetRowIndex + 1; // 1-based index for A1 notation
    const colLetter = getColumnLetter(monthIndex); 
    const range = encodeURIComponent(`${tabName}!${colLetter}${rowNum}`);
    
    const res = await fetch(`${BASE_URL}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[value]] })
    });
    
    if (!res.ok) throw new Error("Failed to update cell.");
    return true;
};