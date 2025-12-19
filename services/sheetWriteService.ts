
import { getAccessToken } from './authService';
import { Trade } from '../types';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Helper to normalize header strings for comparison
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Dynamically maps a Trade object to an array of values based on the sheet's actual headers.
 * This ensures we write to the correct columns even if the user reorders them.
 */
const mapTradeToRow = (trade: Trade, headers: string[]) => {
    // Initialize row with nulls
    const row = new Array(headers.length).fill(null);
    const h = headers.map(normalize);

    // Helper to find index of a matching header that hasn't been filled yet.
    // This prevents one column from being matched by multiple fields (e.g. "Transaction Date" matching both Date and Fee)
    const setVal = (keys: string[], val: string | number) => {
        // 1. Try Exact Match on empty columns first
        let idx = h.findIndex((header, i) => row[i] === null && keys.some(k => header === k));
        
        // 2. If no exact match, try Partial Match on empty columns
        if (idx === -1) {
            idx = h.findIndex((header, i) => row[i] === null && keys.some(k => header.includes(k)));
        }

        if (idx !== -1) {
             row[idx] = val;
        }
    };

    // Mapping Logic - ORDER MATTERS
    // We prioritize specific fields to claim columns first. 
    // "Date" and "Ticker" are most distinct. "Fee" is generic and should go last.
    
    setVal(['date', 'time', 'day'], trade.date);
    setVal(['ticker', 'symbol', 'code', 'asset'], trade.ticker);
    setVal(['quantity', 'qty', 'units', 'shares', 'count', 'amount'], trade.quantity); // 'amount' often implies qty in crypto, but sometimes cost
    setVal(['total', 'value', 'net', 'settlement'], trade.total); 
    setVal(['price', 'cost', 'rate', 'unitprice'], trade.price);
    setVal(['type', 'action', 'side', 'direction'], trade.type);
    
    // Fee is last because "transaction" matches "Transaction Date" and "Transaction Type"
    setVal(['fee', 'commission', 'transaction', 'charge'], trade.fee || 0);

    return row;
};

// Common function to fetch headers and validate
const fetchHeaders = async (sheetId: string, tabName: string, token: string) => {
    const range = encodeURIComponent(`${tabName}!A1:Z1`);
    const headerRes = await fetch(`${BASE_URL}/${sheetId}/values/${range}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!headerRes.ok) {
        if (headerRes.status === 403 || headerRes.status === 401) {
            throw new Error("Permission denied. Two common causes:\n1. 'Google Sheets API' is NOT enabled in your Google Cloud Console.\n2. The Sheet is not shared with your account.");
        }
        if (headerRes.status === 400) {
            throw new Error(`Could not find the tab '${tabName}'. Please check the spelling in Settings.`);
        }
        throw new Error("Failed to fetch sheet headers. Check Sheet ID and Tab Name.");
    }

    const headerJson = await headerRes.json();
    const headers = headerJson.values?.[0];

    if (!headers || headers.length === 0) {
        throw new Error(
            `The '${tabName}' tab appears to be empty or missing headers in Row 1.\n\n` +
            `Please open your Google Sheet and add the following headers to Row 1:\n` +
            `Date, Ticker, Type, Quantity, Price, Total`
        );
    }
    return headers;
};

export const addTradeToSheet = async (sheetId: string, tabName: string, trade: Trade) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    const headers = await fetchHeaders(sheetId, tabName, token);
    const rowValues = mapTradeToRow(trade, headers);

    const appendRange = encodeURIComponent(`${tabName}!A1`);
    const appendRes = await fetch(`${BASE_URL}/${sheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [rowValues] })
    });

    if (!appendRes.ok) {
        const err = await appendRes.json();
        throw new Error(err.error?.message || "Failed to write data to Google Sheets.");
    }

    return true;
};

export const updateTradeInSheet = async (sheetId: string, tabName: string, rowIndex: number, trade: Trade) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    // 1. Fetch headers to ensure we map the updated data to the correct columns
    const headers = await fetchHeaders(sheetId, tabName, token);
    
    // 2. Map data
    const rowValues = mapTradeToRow(trade, headers);

    // 3. Update specific row
    // rowIndex comes from the CSV parser which is 0-based. 
    // Sheet API A1 notation is 1-based.
    // If rowIndex is 1 (first data row), we want A2.
    const rowNumber = rowIndex + 1;
    const updateRange = encodeURIComponent(`${tabName}!A${rowNumber}`);

    const updateRes = await fetch(`${BASE_URL}/${sheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            values: [rowValues] 
        })
    });

    if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error?.message || "Failed to update row in Google Sheets.");
    }

    return true;
};

// --- Deletion Logic ---

const getSheetGridId = async (spreadsheetId: string, tabName: string, token: string): Promise<number> => {
    const res = await fetch(`${BASE_URL}/${spreadsheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        throw new Error("Failed to fetch Spreadsheet metadata. Ensure 'Google Sheets API' is enabled.");
    }

    const data = await res.json();
    const sheet = data.sheets?.find((s: any) => s.properties?.title === tabName);

    if (!sheet) {
        throw new Error(`Could not find tab named '${tabName}' in metadata.`);
    }

    return sheet.properties.sheetId;
};

export const deleteTradeFromSheet = async (sheetId: string, tabName: string, rowIndex: number) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    if (rowIndex === undefined || rowIndex < 1) {
        throw new Error("Invalid Row Index. Cannot delete header or unknown row.");
    }

    const gridId = await getSheetGridId(sheetId, tabName, token);

    const batchUpdateRequest = {
        requests: [
            {
                deleteDimension: {
                    range: {
                        sheetId: gridId,
                        dimension: "ROWS",
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }
        ]
    };

    const res = await fetch(`${BASE_URL}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchUpdateRequest)
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to delete row from Google Sheet.");
    }

    return true;
};
