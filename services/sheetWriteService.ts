
import { getAccessToken } from './authService';
import { Trade, Asset } from '../types';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Helper to normalize header strings for comparison
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

// --- Mapping Logic ---

const mapTradeToRow = (trade: Trade, headers: string[]) => {
    const row = new Array(headers.length).fill(null);
    const h = headers.map(normalize);

    const setVal = (keys: string[], val: string | number) => {
        let idx = h.findIndex((header, i) => row[i] === null && keys.some(k => header === k));
        if (idx === -1) {
            idx = h.findIndex((header, i) => row[i] === null && keys.some(k => header.includes(k)));
        }
        if (idx !== -1) {
             row[idx] = val;
        }
    };
    
    setVal(['date', 'time', 'day'], trade.date);
    setVal(['ticker', 'symbol', 'code', 'asset'], trade.ticker);
    setVal(['quantity', 'qty', 'units', 'shares', 'count', 'amount'], trade.quantity);
    setVal(['total', 'value', 'net', 'settlement'], trade.total); 
    setVal(['price', 'cost', 'rate', 'unitprice'], trade.price);
    setVal(['type', 'action', 'side', 'direction'], trade.type);
    setVal(['fee', 'commission', 'transaction', 'charge'], trade.fee || 0);

    return row;
};

const mapAssetToRow = (asset: Asset, headers: string[]) => {
    const row = new Array(headers.length).fill(null);
    const h = headers.map(normalize);

    const setVal = (keys: string[], val: string | number) => {
        let idx = h.findIndex((header, i) => row[i] === null && keys.some(k => header === k));
        if (idx === -1) {
            idx = h.findIndex((header, i) => row[i] === null && keys.some(k => header.includes(k)));
        }
        if (idx !== -1) {
             row[idx] = val;
        }
    };

    // PRIORITIZE TYPE: "Category" or "Type" headers are specific. 
    // We must map this first so that the "Name" mapping doesn't accidentally grab "Asset Category" 
    // simply because it contains the word "Asset".
    setVal(['type', 'category', 'class', 'asset type', 'kind'], asset.type);

    // Map Name second. 
    // Note: We include 'asset' here as a fallback for headers like "Asset", 
    // but since Type runs first, "Asset Category" should already be filled.
    setVal(['name', 'account', 'item', 'description', 'holding', 'security', 'asset'], asset.name);
    
    setVal(['value', 'amount', 'balance', 'current value', 'market value', 'total', 'market val'], asset.value);
    setVal(['currency', 'curr', 'ccy'], asset.currency);
    setVal(['last updated', 'date', 'updated', 'as of'], asset.lastUpdated || new Date().toISOString().split('T')[0]);

    return row;
};

// --- API Helpers ---

const fetchHeaders = async (sheetId: string, tabName: string, token: string) => {
    const range = encodeURIComponent(`${tabName}!A1:Z1`);
    const headerRes = await fetch(`${BASE_URL}/${sheetId}/values/${range}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!headerRes.ok) {
        if (headerRes.status === 403 || headerRes.status === 401) {
            throw new Error("Permission denied. Ensure 'Google Sheets API' is enabled.");
        }
        if (headerRes.status === 400) {
            throw new Error(`Could not find the tab '${tabName}'.`);
        }
        throw new Error("Failed to fetch sheet headers.");
    }

    const headerJson = await headerRes.json();
    const headers = headerJson.values?.[0];

    if (!headers || headers.length === 0) {
        throw new Error(`The '${tabName}' tab appears to be empty or missing headers in Row 1.`);
    }
    return headers;
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

// --- Exports ---

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
        throw new Error(err.error?.message || "Failed to write data.");
    }

    return true;
};

export const addAssetToSheet = async (sheetId: string, tabName: string, asset: Asset) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    const headers = await fetchHeaders(sheetId, tabName, token);
    const rowValues = mapAssetToRow(asset, headers);

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
        throw new Error(err.error?.message || "Failed to write asset data.");
    }

    return true;
};

export const updateTradeInSheet = async (sheetId: string, tabName: string, rowIndex: number, trade: Trade) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    const headers = await fetchHeaders(sheetId, tabName, token);
    const rowValues = mapTradeToRow(trade, headers);
    const rowNumber = rowIndex + 1;
    const updateRange = encodeURIComponent(`${tabName}!A${rowNumber}`);

    const updateRes = await fetch(`${BASE_URL}/${sheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [rowValues] })
    });

    if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error?.message || "Failed to update row.");
    }

    return true;
};

export const updateAssetInSheet = async (sheetId: string, tabName: string, rowIndex: number, asset: Asset) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    const headers = await fetchHeaders(sheetId, tabName, token);
    const rowValues = mapAssetToRow(asset, headers);
    const rowNumber = rowIndex + 1;
    const updateRange = encodeURIComponent(`${tabName}!A${rowNumber}`);

    const updateRes = await fetch(`${BASE_URL}/${sheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [rowValues] })
    });

    if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error?.message || "Failed to update asset row.");
    }

    return true;
};

// Generic Delete Function (used for both Trades and Assets)
export const deleteRowFromSheet = async (sheetId: string, tabName: string, rowIndex: number) => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required.");

    if (rowIndex === undefined || rowIndex < 1) {
        throw new Error("Invalid Row Index.");
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
        throw new Error(err.error?.message || "Failed to delete row.");
    }

    return true;
};

// Alias for backward compatibility if needed, though we will update usages
export const deleteTradeFromSheet = deleteRowFromSheet;
export const deleteAssetFromSheet = deleteRowFromSheet;
