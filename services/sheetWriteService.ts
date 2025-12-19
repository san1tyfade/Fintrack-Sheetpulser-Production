
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
