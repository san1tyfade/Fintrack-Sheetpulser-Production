
import { getAccessToken } from './authService';
import { Trade, Asset, Subscription, BankAccount, TaxRecord } from '../types';

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

const mapTaxRecordToRow = (record: TaxRecord, headers: string[]) => {
    const row = new Array(headers.length).fill(null);
    setCellValue(row, headers, ['account type', 'record type', 'type', 'category'], record.recordType);
    setCellValue(row, headers, ['account/fund', 'fund', 'account'], record.accountFund);
    setCellValue(row, headers, ['transcation type', 'transaction type', 'trans type', 'action'], record.transactionType);
    setCellValue(row, headers, ['date', 'time'], record.date);
    setCellValue(row, headers, ['value', 'amount'], record.value);
    setCellValue(row, headers, ['description', 'note', 'details'], record.description);
    return row;
};

// --- API Helpers ---

const fetchHeaders = async (sheetId: string, tabName: string, token: string) => {
    const range = encodeURIComponent(`${tabName}!A1:Z2`);
    const headerRes = await fetch(`${BASE_URL}/${sheetId}/values/${range}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!headerRes.ok) throw new Error(`Could not find headers in tab '${tabName}'.`);
    const headerJson = await headerRes.json();
    
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

// --- Yearly Reset Logic ---

/**
 * Resets the yearly ledger:
 * 1. Archives current Income/Expense sheets to Income-YY/Expense-YY
 * 2. On the ARCHIVED Income sheet:
 *    - Copies TOTAL values (B6:M6) over the first Income row (B4:M4)
 *    - Clears the details (B5:M6)
 * 3. Clears data ranges on the ACTIVE sheets (Income B4:M5, B10:M; Expense B7:M)
 * 4. Increments year in headers at Row 3 (Income) and Row 6 (Expense tab)
 */
export const resetYearlyLedger = async (spreadsheetId: string, incomeTab: string, expenseTab: string) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    // 1. Fetch current header to determine current year
    const incomeRange = encodeURIComponent(`${incomeTab}!B3`);
    const headerRes = await fetch(`${BASE_URL}/${spreadsheetId}/values/${incomeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!headerRes.ok) throw new Error("Failed to read year header.");
    const headerData = await headerRes.json();
    const currentHeader = headerData.values?.[0]?.[0] || 'Jan-25';
    const yearMatch = currentHeader.match(/-(\d{2,4})$/);
    const currentYearShort = yearMatch ? yearMatch[1] : '25';
    const nextYearFull = 2000 + parseInt(currentYearShort) + 1;
    const nextYearShort = String(nextYearFull).slice(-2);

    // 2. Fetch current Income Totals (B6:M6) from ACTIVE sheet before clearing
    const totalsRange = encodeURIComponent(`${incomeTab}!B6:M6`);
    const totalsRes = await fetch(`${BASE_URL}/${spreadsheetId}/values/${totalsRange}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!totalsRes.ok) throw new Error("Failed to capture current income totals.");
    const totalsData = await totalsRes.json();
    const incomeTotalsRow = totalsData.values || [new Array(12).fill(0)];

    // 3. Archive current sheets using duplicateSheet
    const incomeGridId = await getSheetGridId(spreadsheetId, incomeTab, token);
    const expenseGridId = await getSheetGridId(spreadsheetId, expenseTab, token);

    const archivedIncomeName = `${incomeTab}-${currentYearShort}`;
    const archivedExpenseName = `${expenseTab}-${currentYearShort}`;

    const archiveRequests = [
        { duplicateSheet: { sourceSheetId: incomeGridId, newSheetName: archivedIncomeName } },
        { duplicateSheet: { sourceSheetId: expenseGridId, newSheetName: archivedExpenseName } }
    ];

    const archiveRes = await fetch(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: archiveRequests })
    });
    if (!archiveRes.ok) throw new Error("Failed to archive sheets.");

    // 4. Modify the CLONED Income sheet (Archive)
    // Collapse breakdown: Set B4:M4 to Totals and clear B5:M6
    const emptyDetailsRow = new Array(12).fill("");
    const archiveUpdates = [
        { range: `${archivedIncomeName}!B4:M4`, values: incomeTotalsRow }, // Move totals up
        { range: `${archivedIncomeName}!B5:M6`, values: [emptyDetailsRow, emptyDetailsRow] }, // Clear details
        { range: `${archivedIncomeName}!A4`, values: [['TOTAL INCOME']] } // Label it clearly
    ];

    const archiveModRes = await fetch(`${BASE_URL}/${spreadsheetId}/values:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: archiveUpdates
        })
    });
    if (!archiveModRes.ok) throw new Error("Failed to simplify archived Income sheet.");

    // 5. Reset ORIGINAL ACTIVE sheets: Clear values and Update Headers
    const resetMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const newHeaders = resetMonths.map(m => `${m}-${nextYearShort}`);
    
    // Clear data ranges
    const emptyRow = new Array(12).fill("");
    const clearRowsCount = 500; 
    const emptyLargeData = new Array(clearRowsCount).fill(emptyRow);
    const emptySmallData = new Array(2).fill(emptyRow); // For B4:M5

    const activeUpdates = [
        // Income Tab Updates
        { range: `${incomeTab}!B3:M3`, values: [newHeaders] },      // Update Income header at Row 3
        { range: `${incomeTab}!B4:M5`, values: emptySmallData },    // Clear B4 to M5
        { range: `${incomeTab}!B10:M${10 + clearRowsCount}`, values: emptyLargeData }, // Clear B10 onwards

        // Detailed Expense Tab Updates
        { range: `${expenseTab}!B6:M6`, values: [newHeaders] },     // Update Expense Detailed Header
        { range: `${expenseTab}!B7:M${7 + clearRowsCount}`, values: emptyLargeData }   // Clear B7 onwards
    ];

    const resetRes = await fetch(`${BASE_URL}/${spreadsheetId}/values:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: activeUpdates
        })
    });

    if (!resetRes.ok) throw new Error("Failed to reset values and headers on active sheets.");

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

export const addTaxRecordToSheet = async (sheetId: string, tabName: string, record: TaxRecord) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return appendToSheet(sheetId, tabName, mapTaxRecordToRow(record, headers));
};

export const updateTaxRecordInSheet = async (sheetId: string, tabName: string, rowIndex: number, record: TaxRecord) => {
    const headers = await fetchHeaders(sheetId, tabName, getAccessToken()!);
    return updateRowInSheet(sheetId, tabName, rowIndex, mapTaxRecordToRow(record, headers));
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

const getColumnLetter = (index: number) => {
    return String.fromCharCode(66 + index);
};

export const updateLedgerValue = async (sheetId: string, tabName: string, category: string, subCategory: string, monthIndex: number, value: number) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    const colARange = encodeURIComponent(`${tabName}!A:A`);
    const searchRes = await fetch(`${BASE_URL}/${sheetId}/values/${colARange}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!searchRes.ok) throw new Error("Failed to scan sheet for row.");
    const searchData = await searchRes.json();
    const rows = searchData.values || [];

    let targetRowIndex = -1;
    let foundCategory = false;
    
    const norm = (s: string) => (s || '').trim().toLowerCase();

    for (let i = 0; i < rows.length; i++) {
        const cell = rows[i][0] ? rows[i][0].toString() : '';
        const nCell = norm(cell);

        if (!foundCategory && nCell === norm(category)) {
            foundCategory = true;
        }

        if (foundCategory) {
            if (nCell === norm(subCategory)) {
                targetRowIndex = i;
                break;
            }
        }
    }

    if (targetRowIndex === -1) {
        targetRowIndex = rows.findIndex((r: any[]) => norm(r[0]) === norm(subCategory));
    }

    if (targetRowIndex === -1) {
        throw new Error(`Could not find row for '${subCategory}' in sheet.`);
    }

    const rowNum = targetRowIndex + 1; 
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
