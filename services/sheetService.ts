
import { getAccessToken } from './authService';

/**
 * Utility to extract the Sheet ID from a URL or raw string.
 */
export const extractSheetId = (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    const cleanInput = input.trim();
    const urlMatch = cleanInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) return urlMatch[1];
    const validIdRegex = /^[a-zA-Z0-9-_]{30,100}$/;
    return validIdRegex.test(cleanInput) ? cleanInput : '';
};

/**
 * Converts Google Sheets API v4 JSON response (values[][]) to a CSV string.
 */
const jsonToCsv = (rows: any[][]): string => {
    if (!Array.isArray(rows) || rows.length === 0) return '';
    return rows.map(row => 
        (Array.isArray(row) ? row : []).map(cell => {
            const str = (cell === null || cell === undefined) ? '' : String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    ).join('\n');
};

/**
 * Fetches data from a specific tab in the spreadsheet.
 */
export const fetchSheetData = async (sheetId: string, tabName: string): Promise<string> => {
    const token = getAccessToken();
    const cleanId = extractSheetId(sheetId);
    
    if (!token) throw new Error("AUTH_REQUIRED: Authentication session expired. Please sign in again.");
    if (!cleanId) throw new Error("INVALID_ID: Invalid Spreadsheet ID.");
    if (!tabName) throw new Error("MISSING_TAB: Tab name is required.");

    const range = encodeURIComponent(`${tabName}!A1:ZZ`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}?valueRenderOption=FORMATTED_VALUE`;
    
    try {
        const res = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Sheets API Error (${res.status}) for tab '${tabName}':`, errorText);

            if (res.status === 403) {
                throw new Error("ACCESS_DENIED: The drive.file scope requires you to re-select this file via the 'Select Sheet' button in Settings.");
            }
            if (res.status === 404) {
                throw new Error(`NOT_FOUND: Tab '${tabName}' not found in the spreadsheet.`);
            }
            throw new Error(`SYNC_FAILED: API returned status ${res.status} for tab '${tabName}'.`);
        }

        const data = await res.json();
        if (!data.values) {
            console.warn(`Tab '${tabName}' exists but returned no values.`);
            return '';
        }
        return jsonToCsv(data.values);
    } catch (e: any) {
        console.error(`Fetch operation failed for tab '${tabName}':`, e);
        if (e.message.includes('Failed to fetch')) {
            throw new Error("NETWORK_ERROR: Could not connect to Google API. Check your connection or CORS settings.");
        }
        throw e;
    }
};

/**
 * Fetches metadata for all tabs in the spreadsheet.
 */
export const fetchTabNames = async (sheetId: string): Promise<string[]> => {
    const token = getAccessToken();
    const cleanId = extractSheetId(sheetId);
    if (!token || !cleanId) return [];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties.title`;
    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.sheets?.map((s: any) => s.properties?.title) || [];
    } catch (e) {
        console.error("Failed to fetch tab names", e);
        return [];
    }
};

/**
 * Minimal validation for tab existence.
 */
export const validateSheetTab = async (sheetId: string, tabName: string): Promise<boolean> => {
    try {
        const token = getAccessToken();
        const cleanId = extractSheetId(sheetId);
        if (!cleanId || !tabName || !token) return false;
        
        // Remove empty ?key= parameter as it can cause authentication mismatches
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(tabName + '!A1')}`;
        
        const res = await fetch(url, { 
            headers: { Authorization: `Bearer ${token}` } 
        });
        return res.ok;
    } catch (e) {
        console.warn(`Validation failed for '${tabName}':`, e);
        return false;
    }
};
